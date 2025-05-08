import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { Annotation, Comment } from '../types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

interface UseAnnotationsProps {
    url: string;
    did: string | null;
}

interface UseAnnotationsResult {
    annotations: Annotation[];
    profiles: Record<string, any>;
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (annotationId: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}

export const useAnnotations = ({ url, did }: UseAnnotationsProps): UseAnnotationsResult => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const currentUrlRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Reset state when URL changes to prevent phantom annotations
        setAnnotations([]);
        setProfiles({});
        setError(null);
        setLoading(false);

        if (!url) {
            console.log('useAnnotations: No URL provided, skipping fetch');
            return;
        }

        if (storageLoading) {
            console.log('useAnnotations: Waiting for storage to initialize');
            setLoading(true);
            return;
        }

        if (!storage) {
            console.error('useAnnotations: Storage not initialized');
            setError(storageError || 'Storage not initialized');
            setLoading(false);
            return;
        }

        const normalizedUrl = normalizeUrl(url);
        currentUrlRef.current = normalizedUrl;
        console.log('useAnnotations: Fetching annotations for URL:', normalizedUrl);
        setLoading(true);
        setError(null);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const updateAnnotations = (newAnnotations: Annotation[]) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring update for stale URL:', normalizedUrl);
                return;
            }

            // Filter out invalid annotations and their comments
            const validAnnotations = newAnnotations
                .filter(
                    (annotation) =>
                        annotation.id &&
                        annotation.author &&
                        annotation.content &&
                        !annotation.isDeleted
                )
                .map((annotation) => ({
                    ...annotation,
                    comments: annotation.comments
                        ? annotation.comments.filter(
                            (comment) =>
                                comment.id &&
                                comment.author &&
                                comment.content &&
                                !comment.isDeleted
                        )
                        : [],
                }));

            setAnnotations(validAnnotations);
        };

        storage.getAnnotations(normalizedUrl, updateAnnotations).then((fetchedAnnotations) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring fetch result for stale URL:', normalizedUrl);
                return;
            }

            console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);

            // Filter out invalid annotations and their comments
            const validAnnotations = fetchedAnnotations
                .filter(
                    (annotation) =>
                        annotation.id &&
                        annotation.author &&
                        annotation.content &&
                        !annotation.isDeleted
                )
                .map((annotation) => ({
                    ...annotation,
                    comments: annotation.comments
                        ? annotation.comments.filter(
                            (comment) =>
                                comment.id &&
                                comment.author &&
                                comment.content &&
                                !comment.isDeleted
                        )
                        : [],
                }));
            setAnnotations(validAnnotations);

            // Fetch profiles for annotation authors and comment authors
            const authorDids = new Set<string>();
            validAnnotations.forEach((annotation) => {
                if (typeof annotation.author === 'string') {
                    authorDids.add(annotation.author);
                }
                (annotation.comments || []).forEach((comment) => {
                    if (typeof comment.author === 'string') {
                        authorDids.add(comment.author);
                    }
                });
            });

            const profilePromises = Array.from(authorDids).map((did) =>
                storage.getProfile(did).then((profile) => ({
                    did,
                    profile,
                }))
            );

            Promise.all(profilePromises).then((profileResults) => {
                if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                    console.log('useAnnotations: Ignoring profile results for stale URL:', normalizedUrl);
                    return;
                }

                const newProfiles = profileResults.reduce((acc: Record<string, any>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    }
                    return acc;
                }, {});
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
            }).catch((err) => {
                console.error('useAnnotations: Failed to fetch profiles:', err);
                setError('Failed to fetch profiles: ' + (err.message || 'Unknown error'));
            });
        }).catch((err) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring error for stale URL:', normalizedUrl);
                return;
            }
            console.error('useAnnotations: Failed to fetch annotations:', err);
            setError(err.message || 'Failed to fetch annotations');
        }).finally(() => {
            if (currentUrlRef.current === normalizedUrl) {
                setLoading(false);
            }
        });

        return () => {
            console.log('useAnnotations: Cleaning up for URL:', normalizedUrl);
            storage.cleanupAnnotationsListeners(normalizedUrl);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentUrlRef.current = null;
        };
    }, [url, storage, storageLoading, storageError]);

    const handleSaveAnnotation = useCallback(async (content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!url) {
            throw new Error('No URL provided for annotation');
        }

        const annotation: Annotation = {
            id: Date.now().toString(),
            url: normalizeUrl(url),
            content,
            author: did,
            timestamp: Date.now(),
            comments: [],
            text: '',
            isDeleted: false,
        };

        await storage.saveAnnotation(annotation);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations((prev) => [...prev, annotation]);
        }
    }, [did, url, storage]);

    const handleDeleteAnnotation = useCallback(async (annotationId: string) => {
        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!url) {
            throw new Error('No URL provided for deletion');
        }

        await storage.deleteAnnotation(normalizeUrl(url), annotationId);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations((prev) => prev.filter((annotation) => annotation.id !== annotationId));
        }
    }, [url, storage]);

    const handleSaveComment = useCallback(async (annotationId: string, content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!url) {
            throw new Error('No URL provided for comment');
        }

        const comment: Comment = {
            id: Date.now().toString(),
            content,
            author: did,
            timestamp: Date.now(),
            isDeleted: false,
            annotationId: annotationId,
        };

        await storage.saveComment(normalizeUrl(url), annotationId, comment);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations((prev) =>
                prev.map((annotation) =>
                    annotation.id === annotationId
                        ? {
                            ...annotation,
                            comments: [...(annotation.comments || []).filter((c) => !c.isDeleted), comment],
                        }
                        : annotation
                )
            );
        }
    }, [did, url, storage]);

    return {
        annotations,
        profiles,
        error: error || storageError,
        loading: loading || storageLoading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
    };
};