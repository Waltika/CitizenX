import { useState, useEffect, useCallback } from 'react';
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

    useEffect(() => {
        if (!url) {
            console.log('useAnnotations: No URL provided, skipping fetch');
            setLoading(false);
            return;
        }

        if (storageLoading) {
            console.log('useAnnotations: Waiting for storage to initialize');
            setLoading(true); // Show loading while waiting for storage
            return;
        }

        if (!storage) {
            console.error('useAnnotations: Storage not initialized');
            setError(storageError || 'Storage not initialized');
            setLoading(false);
            return;
        }

        const normalizedUrl = normalizeUrl(url);
        console.log('useAnnotations: Fetching annotations for URL:', normalizedUrl);
        setLoading(true);
        setError(null);

        storage.getAnnotations(normalizedUrl).then((fetchedAnnotations) => {
            console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);
            setAnnotations(fetchedAnnotations);

            const profilePromises = fetchedAnnotations.map((annotation) =>
                storage.getProfile(annotation.author).then((profile) => ({
                    did: annotation.author,
                    profile,
                }))
            );

            Promise.all(profilePromises).then((profileResults) => {
                const newProfiles = profileResults.reduce((acc: Record<string, any>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    }
                    return acc;
                }, {});
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
            });
        }).catch((err) => {
            console.error('useAnnotations: Failed to fetch annotations:', err);
            setError(err.message || 'Failed to fetch annotations');
        }).finally(() => {
            setLoading(false);
        });
    }, [url, storage, storageLoading, storageError]);

    const handleSaveAnnotation = useCallback(async (content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        const annotation: Annotation = {
            id: Date.now().toString(),
            url: normalizeUrl(url),
            content,
            author: did,
            timestamp: Date.now(),
            comments: [],
        };

        await storage.saveAnnotation(annotation);
        setAnnotations((prev) => [...prev, annotation]);
    }, [did, url, storage]);

    const handleDeleteAnnotation = useCallback(async (annotationId: string) => {
        if (!storage) {
            throw new Error('Storage not initialized');
        }

        await storage.deleteAnnotation(normalizeUrl(url), annotationId);
        setAnnotations((prev) => prev.filter((annotation) => annotation.id !== annotationId));
    }, [url, storage]);

    const handleSaveComment = useCallback(async (annotationId: string, content: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        const comment: Comment = {
            id: Date.now().toString(),
            content,
            author: did,
            timestamp: Date.now(),
        };

        await storage.saveComment(normalizeUrl(url), annotationId, comment);
        setAnnotations((prev) =>
            prev.map((annotation) =>
                annotation.id === annotationId
                    ? { ...annotation, comments: [...(annotation.comments || []), comment] }
                    : annotation
            )
        );
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