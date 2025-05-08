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
    handleDeleteComment: (annotationId: string, commentId: string) => Promise<void>;
}

export const useAnnotations = ({ url, did }: UseAnnotationsProps): UseAnnotationsResult => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [pendingAnnotations, setPendingAnnotations] = useState<Annotation[]>([]);
    const [pendingComments, setPendingComments] = useState<Comment[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const currentUrlRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchProfileWithRetries = useCallback(async (did: string, attempt: number = 1): Promise<{ did: string, profile: any } | null> => {
        const maxRetries = 3;
        const retryDelay = 500;

        try {
            const profile = await storage!.getProfile(did);
            if (profile) {
                console.log(`useAnnotations: Successfully fetched profile for DID ${did} on attempt ${attempt}:`, profile);
                return { did, profile };
            } else if (attempt < maxRetries) {
                console.log(`useAnnotations: Profile not found for DID ${did} on attempt ${attempt}, retrying after ${retryDelay}ms`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return fetchProfileWithRetries(did, attempt + 1);
            } else {
                console.warn(`useAnnotations: Failed to fetch profile for DID ${did} after ${maxRetries} attempts`);
                return null;
            }
        } catch (err) {
            console.error(`useAnnotations: Error fetching profile for DID ${did} on attempt ${attempt}:`, err);
            if (attempt < maxRetries) {
                console.log(`useAnnotations: Retrying profile fetch for DID ${did} after ${retryDelay}ms`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return fetchProfileWithRetries(did, attempt + 1);
            } else {
                console.warn(`useAnnotations: Failed to fetch profile for DID ${did} after ${maxRetries} attempts`);
                return null;
            }
        }
    }, [storage]);

    const updateProfilesForAnnotations = useCallback(async (newAnnotations: Annotation[]) => {
        const newDids = newAnnotations
            .map(annotation => annotation.author)
            .filter(did => did && !profiles[did]); // Only fetch profiles for DIDs not already in state

        if (newDids.length === 0) {
            console.log('useAnnotations: No new profiles to fetch for annotations:', newAnnotations);
            return;
        }

        console.log('useAnnotations: Fetching profiles for new DIDs:', newDids);
        const profilePromises = newDids.map(did => fetchProfileWithRetries(did));
        const profileResults = await Promise.all(profilePromises);

        const newProfiles = profileResults.reduce((acc: Record<string, any>, result) => {
            if (result && result.profile) {
                acc[result.did] = result.profile;
            } else {
                console.log(`useAnnotations: No profile loaded for DID ${result?.did}, using default`);
                acc[result?.did || ''] = { handle: 'Unknown' };
            }
            return acc;
        }, {});

        setProfiles((prev) => {
            const updatedProfiles = { ...prev, ...newProfiles };
            console.log('useAnnotations: Updated profiles state:', updatedProfiles);
            return updatedProfiles;
        });
    }, [profiles, fetchProfileWithRetries]);

    useEffect(() => {
        if (!url) {
            console.log('useAnnotations: No URL provided, skipping fetch');
            setLoading(false);
            setAnnotations([]);
            setPendingAnnotations([]);
            setPendingComments([]);
            setProfiles({});
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
        setPendingAnnotations([]);
        setPendingComments([]);

        // Create a new AbortController for this fetch
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const updateAnnotations = async (newAnnotations: Annotation[]) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring update for stale URL:', normalizedUrl);
                return;
            }

            // Deduplicate annotations by id
            const uniqueAnnotations: Annotation[] = Array.from(
                new Map(newAnnotations.map(item => [item.id, item])).values()
            );

            // Filter out deleted annotations
            const filteredAnnotations = uniqueAnnotations.filter(ann => !ann.isDeleted);

            // Update comments within each annotation to exclude deleted comments
            const annotationsWithFilteredComments = filteredAnnotations.map(ann => {
                const currentComments = annotations.find(a => a.id === ann.id)?.comments || [];
                const updatedComments = (ann.comments || []).filter(comment => {
                    const currentComment = currentComments.find(c => c.id === comment.id);
                    return !comment.isDeleted && (!currentComment || !currentComment.isDeleted);
                });
                return { ...ann, comments: updatedComments };
            });

            // Clear pending annotations/comments that are now confirmed
            setPendingAnnotations((prev) =>
                prev.filter(pending => !annotationsWithFilteredComments.some(ann => ann.id === pending.id))
            );
            setPendingComments((prev) =>
                prev.filter(pending => !annotationsWithFilteredComments.some(ann =>
                    ann.comments?.some(c => c.id === pending.id)
                ))
            );

            setAnnotations(annotationsWithFilteredComments);
            await updateProfilesForAnnotations(annotationsWithFilteredComments);
        };

        storage.getAnnotations(normalizedUrl, updateAnnotations).then(async (fetchedAnnotations) => {
            if (signal.aborted || currentUrlRef.current !== normalizedUrl) {
                console.log('useAnnotations: Ignoring fetch result for stale URL:', normalizedUrl);
                return;
            }

            console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);
            setAnnotations(fetchedAnnotations);
            await updateProfilesForAnnotations(fetchedAnnotations);
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

        // Cleanup function
        return () => {
            console.log('useAnnotations: Cleaning up for URL:', normalizedUrl);
            storage.cleanupAnnotationsListeners(normalizedUrl);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentUrlRef.current = null;
        };
    }, [url, storage, storageLoading, storageError, updateProfilesForAnnotations]);

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

        // Add to pending annotations for immediate feedback
        setPendingAnnotations((prev) => {
            const uniquePending: Annotation[] = Array.from(
                new Map([...prev, annotation].map(item => [item.id, item])).values()
            );
            console.log('useAnnotations: Adding pending annotation:', annotation);
            return uniquePending;
        });

        await storage.saveAnnotation(annotation);
        // Rely on the updateAnnotations callback to update the state
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
            setPendingAnnotations((prev) => prev.filter((annotation) => annotation.id !== annotationId));
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
            annotationId,
        };

        // Add to pending comments for immediate feedback
        setPendingComments((prev) => {
            const uniquePending: Comment[] = Array.from(
                new Map([...prev, comment].map(item => [item.id, item])).values()
            );
            console.log('useAnnotations: Adding pending comment:', comment);
            return uniquePending;
        });

        await storage.saveComment(normalizeUrl(url), annotationId, comment);
        // Rely on the updateAnnotations callback to update the state
    }, [did, url, storage]);

    const handleDeleteComment = useCallback(async (annotationId: string, commentId: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!url) {
            throw new Error('No URL provided for comment deletion');
        }

        // Batch state updates to minimize re-renders
        setAnnotations((prevAnnotations) => {
            const updatedAnnotations = prevAnnotations.map((annotation) =>
                annotation.id === annotationId
                    ? {
                        ...annotation,
                        comments: (annotation.comments || []).filter(
                            (comment) => comment.id !== commentId
                        ),
                    }
                    : annotation
            );
            setPendingComments((prevPending) =>
                prevPending.filter((comment) => comment.id !== commentId)
            );
            return updatedAnnotations;
        });

        await storage.deleteComment(normalizeUrl(url), annotationId, commentId);
        // Rely on updateAnnotations to handle the final state update from the database
    }, [did, url, storage]);

    // Combine pending annotations and confirmed annotations, ensuring deduplication
    const combinedAnnotations: Annotation[] = Array.from(
        new Map([...pendingAnnotations, ...annotations].map(item => [item.id, item])).values()
    );

    const displayedAnnotations: Annotation[] = combinedAnnotations.map((annotation: Annotation) => {
        const pendingForAnnotation: Comment[] = pendingComments.filter(
            (comment: Comment) => comment.annotationId === annotation.id && !comment.isDeleted
        );
        const confirmedComments: Comment[] = (annotation.comments || []).filter(
            (comment) => !comment.isDeleted
        );
        return {
            ...annotation,
            comments: Array.from(
                new Map([...confirmedComments, ...pendingForAnnotation].map(item => [item.id, item])).values()
            ) as Comment[]
        };
    });

    return {
        annotations: displayedAnnotations,
        profiles,
        error: error || storageError,
        loading: loading || storageLoading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
        handleDeleteComment,
    };
};