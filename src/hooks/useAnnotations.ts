import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { Annotation, Comment, Profile } from '@/types'; // Ensure Profile is imported
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { storage } from '../storage/StorageRepository'; // Correct import path

interface UseAnnotationsProps {
    url: string;
    did: string | null; // Allow string | null to match useUserProfile
    tabId?: number;
}

interface UseAnnotationsResult {
    annotations: Annotation[];
    profiles: Record<string, Profile>; // Use Profile type
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string, tabId?: number) => Promise<void>; // Add tabId parameter
    handleDeleteAnnotation: (annotationId: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
    handleDeleteComment: (annotationId: string, commentId: string) => Promise<void>;
}

export const useAnnotations = ({ url, did, tabId }: UseAnnotationsProps): UseAnnotationsResult => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const currentUrlRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
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

            const authorDids = new Set<string>();
            validAnnotations.forEach((annotation) => {
                if (typeof annotation.author === 'string' && annotation.author.startsWith('did:')) {
                    authorDids.add(annotation.author);
                } else {
                    console.warn('useAnnotations: Skipping invalid annotation author:', annotation.author, 'for annotation:', annotation.id);
                }
                (annotation.comments || []).forEach((comment) => {
                    if (typeof comment.author === 'string' && comment.author.startsWith('did:')) {
                        authorDids.add(comment.author);
                    } else {
                        console.warn('useAnnotations: Skipping invalid comment author:', comment.author, 'for comment:', comment.id, 'in annotation:', annotation.id);
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

                const newProfiles = profileResults.reduce((acc: Record<string, Profile>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    } else {
                        acc[did] = { did, handle: 'Unknown' }; // Add did to satisfy Profile type
                    }
                    return acc;
                }, {});
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
            }).catch((err) => {
                console.error('useAnnotations: Failed to fetch profiles:', err);
                setError('Failed to fetch profiles: ' + (err.message || 'Unknown error'));
            });
        };

        storage.getAnnotations(normalizedUrl, updateAnnotations).then((fetchedAnnotations) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring fetch result for stale URL:', normalizedUrl);
                return;
            }

            console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);

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

            const authorDids = new Set<string>();
            validAnnotations.forEach((annotation: Annotation) => {
                if (typeof annotation.author === 'string' && annotation.author.startsWith('did:')) {
                    authorDids.add(annotation.author);
                } else {
                    console.warn('useAnnotations: Skipping invalid annotation author:', annotation.author, 'for annotation:', annotation.id);
                }
                (annotation.comments || []).forEach((comment: Comment) => {
                    if (typeof comment.author === 'string' && comment.author.startsWith('did:')) {
                        authorDids.add(comment.author);
                    } else {
                        console.warn('useAnnotations: Skipping invalid comment author:', comment.author, 'for comment:', comment.id, 'in annotation:', annotation.id);
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

                const newProfiles = profileResults.reduce((acc: Record<string, Profile>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    } else {
                        acc[did] = { did, handle: 'Unknown' }; // Add did to satisfy Profile type
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

    const handleSaveAnnotation = useCallback(async (content: string, tabId?: number) => {
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

        await storage.saveAnnotation(annotation, tabId);
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

    const handleDeleteComment = useCallback(async (annotationId: string, commentId: string) => {
        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!url) {
            throw new Error('No URL provided for comment deletion');
        }

        await storage.deleteComment(normalizeUrl(url), annotationId, commentId);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations((prev) =>
                prev.map((annotation) =>
                    annotation.id === annotationId
                        ? {
                            ...annotation,
                            comments: (annotation.comments || []).filter((comment) => comment.id !== commentId),
                        }
                        : annotation
                )
            );
        }
    }, [url, storage]);

    return {
        annotations,
        profiles,
        error: error || storageError,
        loading: loading || storageLoading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
        handleDeleteComment,
    };
};