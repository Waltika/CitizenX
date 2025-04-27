import { useState, useEffect, useCallback } from 'react';
import { useStorage } from './useStorage';
import { Annotation } from '../types';

interface UseAnnotationsProps {
    url: string;
    did: string | null;
}

interface UseAnnotationsReturn {
    annotations: Annotation[];
    profiles: { [key: string]: { handle: string; profilePicture?: string } };
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}

export const useAnnotations = ({ url, did }: UseAnnotationsProps): UseAnnotationsReturn => {
    const { storage } = useStorage();
    const [annotationsByUrl, setAnnotationsByUrl] = useState<{ [key: string]: Annotation[] }>({});
    const [profiles, setProfiles] = useState<{ [key: string]: { handle: string; profilePicture?: string } }>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    // Debounce timer for URL changes
    const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!storage) {
            console.log('useAnnotations: Waiting for storage to initialize');
            return;
        }

        if (!did) {
            console.log('useAnnotations: Not authenticated or storage not initialized', { storage, did });
            return;
        }

        console.log('useAnnotations: Starting fetch for annotations');

        // Clear any existing debounce timeout
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        // Set a new debounce timeout
        const timeout = setTimeout(async () => {
            setLoading(true);
            setIsFetching(true);

            try {
                // Fetch annotations for the current URL
                const loadedAnnotations = await storage.getAnnotations(url, (updatedAnnotations) => {
                    // Real-time updates for the current URL
                    setAnnotationsByUrl((prev) => ({
                        ...prev,
                        [url]: updatedAnnotations,
                    }));
                });

                // Update annotations for the current URL
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: loadedAnnotations,
                }));

                // Fetch profiles for authors
                const authorDIDs = [...new Set(loadedAnnotations.map((ann) => ann.author))];
                const profilePromises = authorDIDs.map(async (authorDID) => {
                    if (!profiles[authorDID]) {
                        const profile = await storage.getProfile(authorDID);
                        if (profile) {
                            console.log('useAnnotations: Loaded profile for DID:', authorDID, profile);
                            return { did: authorDID, profile };
                        }
                    }
                    return null;
                });

                const loadedProfiles = (await Promise.all(profilePromises)).filter((p) => p !== null);
                const newProfiles = loadedProfiles.reduce((acc, { did, profile }) => {
                    acc[did] = { handle: profile.handle, profilePicture: profile.profilePicture };
                    return acc;
                }, {} as { [key: string]: { handle: string; profilePicture?: string } });

                setProfiles((prev) => ({
                    ...prev,
                    ...newProfiles,
                }));

                console.log('useAnnotations: Initial profiles loaded:', newProfiles);
            } catch (err) {
                console.error('useAnnotations: Failed to fetch annotations:', err);
                setError('Failed to fetch annotations');
            } finally {
                setLoading(false);
                setIsFetching(false);
                console.log('useAnnotations: Set loading to false (isFetching false)');
            }
        }, 300); // 300ms debounce

        setDebounceTimeout(timeout);

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [storage, url, did]);

    const handleSaveAnnotation = useCallback(
        async (content: string) => {
            if (!storage || !did) {
                setError('Not authenticated or storage not initialized');
                return;
            }

            try {
                console.log('useAnnotations: Starting save annotation');
                setLoading(true);
                setIsFetching(true);

                const timestamp = Date.now();
                const id = `${did}-${timestamp}`;
                const newAnnotation: Annotation = {
                    id,
                    url,
                    content,
                    author: did,
                    timestamp,
                    comments: [],
                };

                console.log('useAnnotations: Saving annotation to storage:', newAnnotation);
                await storage.saveAnnotation(newAnnotation);

                // Optimistically update the UI
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: [...(prev[url] || []), newAnnotation],
                }));

                // Fetch the latest annotations to ensure consistency
                const updatedAnnotations = await storage.getAnnotations(url);
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: updatedAnnotations,
                }));

                // Fetch the author's profile if not already loaded
                if (!profiles[did]) {
                    const profile = await storage.getProfile(did);
                    if (profile) {
                        setProfiles((prev) => ({
                            ...prev,
                            [did]: { handle: profile.handle, profilePicture: profile.profilePicture },
                        }));
                    }
                }

                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save annotation:', err);
                setError('Failed to save annotation');
            } finally {
                setLoading(false);
                setIsFetching(false);
            }
        },
        [storage, did, url, profiles]
    );

    const handleDeleteAnnotation = useCallback(
        async (id: string) => {
            if (!storage || !did) {
                setError('Not authenticated or storage not initialized');
                return;
            }

            try {
                setLoading(true);
                setIsFetching(true);

                await storage.deleteAnnotation(url, id);

                // Optimistically update the UI
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: (prev[url] || []).filter((ann) => ann.id !== id),
                }));

                // Fetch the latest annotations to ensure consistency
                const updatedAnnotations = await storage.getAnnotations(url);
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: updatedAnnotations,
                }));

                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to delete annotation:', err);
                setError('Failed to delete annotation');
            } finally {
                setLoading(false);
                setIsFetching(false);
            }
        },
        [storage, did, url]
    );

    const handleSaveComment = useCallback(
        async (annotationId: string, content: string) => {
            if (!storage || !did) {
                setError('Not authenticated or storage not initialized');
                return;
            }

            try {
                setLoading(true);
                setIsFetching(true);

                const timestamp = Date.now();
                const id = `${did}-${timestamp}`;
                const newComment = {
                    id,
                    content,
                    author: did,
                    timestamp,
                };

                await storage.saveComment(url, annotationId, newComment);

                // Optimistically update the UI
                setAnnotationsByUrl((prev) => {
                    const updatedAnnotations = (prev[url] || []).map((ann) => {
                        if (ann.id === annotationId) {
                            return {
                                ...ann,
                                comments: [...ann.comments, newComment],
                            };
                        }
                        return ann;
                    });
                    return {
                        ...prev,
                        [url]: updatedAnnotations,
                    };
                });

                // Fetch the latest annotations to ensure consistency
                const updatedAnnotations = await storage.getAnnotations(url);
                setAnnotationsByUrl((prev) => ({
                    ...prev,
                    [url]: updatedAnnotations,
                }));

                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save comment:', err);
                setError('Failed to save comment');
            } finally {
                setLoading(false);
                setIsFetching(false);
            }
        },
        [storage, did, url]
    );

    // Return annotations for the current URL
    const currentAnnotations = annotationsByUrl[url] || [];

    return {
        annotations: currentAnnotations,
        profiles,
        error,
        loading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
    };
};