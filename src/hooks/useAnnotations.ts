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

export const useAnnotations = (url: string, db: any, did: string | null): UseAnnotationsResult => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initAnnotationsDB() {
            if (!db) return;
            try {
                const normalizedUrl = url.split('?')[0]; // Simple normalization
                const allDocs = await db.all();
                const urlAnnotations = allDocs
                    .filter((doc: any) => doc.value.url === normalizedUrl)
                    .map((doc: any) => doc.value);
                setAnnotations(urlAnnotations);
            } catch (err) {
                console.error('Failed to load annotations:', err);
                setError('Failed to load annotations');
            }
        }
        initAnnotationsDB();

        if (db) {
            db.events.on('update', async () => {
                const normalizedUrl = url.split('?')[0];
                const allDocs = await db.all();
                const urlAnnotations = allDocs
                    .filter((doc: any) => doc.value.url === normalizedUrl)
                    .map((doc: any) => doc.value);
                setAnnotations(urlAnnotations);
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
            comments: [], // Initialize with empty comments array
        };
        try {
            await db.put(annotation);
            setAnnotations((prev) => [...prev, annotation]);
        } catch (err) {
            console.error('Failed to save annotation:', err);
            setError('Failed to save annotation');
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
            setError('Failed to save comment');
        }
    };

    return { annotations, error, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment };
};