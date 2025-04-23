// src/hooks/useAnnotations.ts
import { useState, useEffect } from 'react';
import { Annotation, Comment } from '../shared/types/annotation';

interface UseAnnotationsResult {
    annotations: Annotation[];
    error: string | null;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'citizenx-pending-annotations';

export const useAnnotations = (url: string, db: any, did: string | null): UseAnnotationsResult => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load pending annotations from localStorage on mount
    useEffect(() => {
        const loadPendingAnnotations = () => {
            const pending = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (pending) {
                const pendingAnnotations = JSON.parse(pending);
                const normalizedUrl = url.split('?')[0];
                const urlPendingAnnotations = pendingAnnotations.filter((a: Annotation) => a.url === normalizedUrl);
                setAnnotations(urlPendingAnnotations);
            } else {
                setAnnotations([]);
            }
        };
        loadPendingAnnotations();
    }, [url]);

    useEffect(() => {
        async function initAnnotationsDB() {
            if (!db) return;
            try {
                const normalizedUrl = url.split('?')[0];
                const allDocs = await db.all();
                const urlAnnotations = allDocs
                    .filter((doc: any) => doc.value.url === normalizedUrl)
                    .map((doc: any) => doc.value);

                // Merge OrbitDB annotations with localStorage annotations
                const pending = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                const pendingAnnotations = JSON.parse(pending);
                const urlPendingAnnotations = pendingAnnotations.filter((a: Annotation) => a.url === normalizedUrl);

                // Combine annotations, avoiding duplicates by _id
                const combinedAnnotations = [
                    ...urlAnnotations,
                    ...urlPendingAnnotations.filter(
                        (pending: Annotation) => !urlAnnotations.some((a: Annotation) => a._id === pending._id)
                    ),
                ];
                setAnnotations(combinedAnnotations);

                // Try to publish any pending annotations
                if (pendingAnnotations.length > 0) {
                    for (const annotation of urlPendingAnnotations) {
                        try {
                            await db.put(annotation);
                            // Remove from pending if successfully published
                            const updatedPending = pendingAnnotations.filter((a: Annotation) => a._id !== annotation._id);
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPending));
                            setAnnotations((prev) =>
                                prev.map((a) => (a._id === annotation._id ? annotation : a))
                            );
                        } catch (err) {
                            console.warn('Failed to publish pending annotation:', err);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load annotations:', err);
                setError('Failed to load annotations');
                // On error, ensure localStorage annotations are still displayed
                const pending = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                const pendingAnnotations = JSON.parse(pending);
                const normalizedUrl = url.split('?')[0];
                const urlPendingAnnotations = pendingAnnotations.filter((a: Annotation) => a.url === normalizedUrl);
                setAnnotations(urlPendingAnnotations);
            }
        }
        initAnnotationsDB();

        if (db) {
            db.events.on('update', async () => {
                try {
                    const normalizedUrl = url.split('?')[0];
                    const allDocs = await db.all();
                    const urlAnnotations = allDocs
                        .filter((doc: any) => doc.value.url === normalizedUrl)
                        .map((doc: any) => doc.value);

                    // Merge with localStorage annotations
                    const pending = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                    const pendingAnnotations = JSON.parse(pending);
                    const urlPendingAnnotations = pendingAnnotations.filter((a: Annotation) => a.url === normalizedUrl);

                    const combinedAnnotations = [
                        ...urlAnnotations,
                        ...urlPendingAnnotations.filter(
                            (pending: Annotation) => !urlAnnotations.some((a: Annotation) => a._id === pending._id)
                        ),
                    ];
                    setAnnotations(combinedAnnotations);
                } catch (err) {
                    console.error('Failed to update annotations:', err);
                    setError('Failed to update annotations');
                }
            });
        }
    }, [db, url]);

    const handleSaveAnnotation = async (content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        if (!db) {
            throw new Error('Database not initialized');
        }
        const annotation: Annotation = {
            _id: `${did}-${Date.now()}`,
            url: url.split('?')[0],
            text: content,
            timestamp: Date.now(),
            did,
            comments: [],
        };
        try {
            await db.put(annotation);
            setAnnotations((prev) => [...prev, annotation]);
        } catch (err) {
            console.error('Failed to save annotation:', err);
            if (err.message.includes('NoPeersSubscribedToTopic')) {
                const pending = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                const pendingAnnotations = JSON.parse(pending);
                pendingAnnotations.push(annotation);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pendingAnnotations));
                setAnnotations((prev) => [...prev, annotation]);
                setError('No peers available, annotation saved locally. It will sync when peers are available.');
            } else {
                setError('Failed to save annotation');
                throw err;
            }
        }
    };

    const handleDeleteAnnotation = async (id: string) => {
        if (!db) {
            throw new Error('Database not initialized');
        }
        try {
            await db.del(id);
            setAnnotations((prev) => prev.filter((annotation) => annotation._id !== id));
        } catch (err) {
            console.error('Failed to delete annotation:', err);
            setError('Failed to delete annotation');
        }
    };

    const handleSaveComment = async (annotationId: string, content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        if (!db) {
            throw new Error('Database not initialized');
        }
        try {
            const annotation = annotations.find((a) => a._id === annotationId);
            if (!annotation) {
                throw new Error('Annotation not found');
            }
            const comment: Comment = {
                _id: `${did}-${Date.now()}`,
                text: content,
                timestamp: Date.now(),
                did,
            };
            const updatedAnnotation: Annotation = {
                ...annotation,
                comments: [...(annotation.comments || []), comment],
            };
            await db.put(updatedAnnotation);
            setAnnotations((prev) =>
                prev.map((a) => (a._id === annotationId ? updatedAnnotation : a))
            );
        } catch (err) {
            console.error('Failed to save comment:', err);
            if (err.message.includes('NoPeersSubscribedToTopic')) {
                const pending = localStorage.getItem(LOCAL_STORAGE_KEY) || '[]';
                let pendingAnnotations = JSON.parse(pending);
                const annotationIndex = pendingAnnotations.findIndex((a: Annotation) => a._id === annotationId);
                const comment: Comment = {
                    _id: `${did}-${Date.now()}`,
                    text: content,
                    timestamp: Date.now(),
                    did,
                };
                if (annotationIndex !== -1) {
                    pendingAnnotations[annotationIndex].comments = [
                        ...(pendingAnnotations[annotationIndex].comments || []),
                        comment,
                    ];
                } else {
                    const annotation = annotations.find((a) => a._id === annotationId);
                    if (annotation) {
                        const updatedAnnotation = {
                            ...annotation,
                            comments: [...(annotation.comments || []), comment],
                        };
                        pendingAnnotations.push(updatedAnnotation);
                    }
                }
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pendingAnnotations));
                setAnnotations((prev) =>
                    prev.map((a) =>
                        a._id === annotationId
                            ? { ...a, comments: [...(a.comments || []), comment] }
                            : a
                    )
                );
                setError('No peers available, comment saved locally. It will sync when peers are available.');
            } else {
                setError('Failed to save comment');
                throw err;
            }
        }
    };

    return { annotations, error, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment };
};