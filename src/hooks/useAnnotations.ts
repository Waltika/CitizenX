import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { useUserProfile } from './useUserProfile';
import { Annotation, Comment } from '../shared/types/annotation';
import { Profile } from '../shared/types/userProfile';

interface UseAnnotationsProps {
    url: string;
    did: string | null;
}

interface UseAnnotationsReturn {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}

export const useAnnotations = ({ url, did }: UseAnnotationsProps): UseAnnotationsReturn => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const { profile: userProfile } = useUserProfile();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [error, setError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadProfiles = async (dids: Set<string>) => {
        const profilesMap: Record<string, Profile> = {};
        const maxRetries = 3;
        const retryDelay = 1000;

        if (did && userProfile && dids.has(did)) {
            profilesMap[did] = userProfile;
            console.log('useAnnotations: Using userProfile for DID:', did, userProfile);
        }

        for (const authorDid of dids) {
            if (profilesMap[authorDid]) continue;

            let profile: Profile | null = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                profile = await storage!.getProfile(authorDid);
                if (profile) {
                    profilesMap[authorDid] = profile;
                    console.log('useAnnotations: Loaded profile for DID:', authorDid, profile);
                    break;
                } else {
                    console.warn('useAnnotations: Failed to load profile for DID on attempt', attempt, authorDid);
                    if (attempt < maxRetries) {
                        console.log(`useAnnotations: Retrying profile load for DID: ${authorDid}, attempt ${attempt}/${maxRetries}`);
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    }
                }
            }
            if (!profile) {
                console.error('useAnnotations: Failed to load profile for DID after retries:', authorDid);
            }
        }
        return profilesMap;
    };

    const loadAnnotations = useCallback(async () => {
        if (storageLoading) {
            console.log('useAnnotations: Waiting for storage to initialize');
            setIsFetching(true);
            return;
        }

        if (!storage || !did) {
            setAnnotations([]);
            setProfiles({});
            setError(storage ? 'Not authenticated' : 'Storage not initialized');
            console.log('useAnnotations: Not authenticated or storage not initialized', { storage: !!storage, did });
            setIsFetching(false);
            return;
        }

        try {
            setIsFetching(true);
            console.log('useAnnotations: Starting fetch for annotations');
            const initialAnnotations = await storage.getAnnotations(url, (updatedAnnotations: Annotation[]) => {
                if (debounceTimeoutRef.current) {
                    clearTimeout(debounceTimeoutRef.current);
                }
                debounceTimeoutRef.current = setTimeout(() => {
                    setIsFetching(true);
                    console.log('useAnnotations: Received real-time update for annotations:', updatedAnnotations);
                    setAnnotations([...updatedAnnotations]);

                    const dids = new Set<string>();
                    updatedAnnotations.forEach((annotation) => {
                        if (annotation.author) dids.add(annotation.author);
                        annotation.comments?.forEach((comment) => {
                            if (comment.author) dids.add(comment.author);
                        });
                    });

                    loadProfiles(dids).then((profilesMap) => {
                        setProfiles(profilesMap);
                        console.log('useAnnotations: Profiles updated after real-time annotation update:', profilesMap);
                        setIsFetching(false);
                    });
                }, 500);
            });
            console.log('useAnnotations: Loaded initial annotations:', initialAnnotations);

            setAnnotations([...initialAnnotations]);

            const dids = new Set<string>();
            initialAnnotations.forEach((annotation) => {
                if (annotation.author) dids.add(annotation.author);
                annotation.comments?.forEach((comment) => {
                    if (comment.author) dids.add(comment.author);
                });
            });

            const profilesMap = await loadProfiles(dids);
            setProfiles(profilesMap);
            setError(null);
            console.log('useAnnotations: Initial profiles loaded:', profilesMap);
            console.log('useAnnotations: Annotations state updated:', initialAnnotations);
        } catch (err) {
            console.error('useAnnotations: Failed to load annotations:', err);
            setError('Failed to load annotations');
            setAnnotations([]);
            setProfiles({});
        } finally {
            setIsFetching(false);
        }
    }, [url, storage, storageLoading, did, userProfile]);

    // Manage the loading state with a minimum display time
    useEffect(() => {
        if (isFetching) {
            setLoading(true);
            console.log('useAnnotations: Set loading to true (isFetching true)');

            // Clear any existing timeout
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        } else {
            // Ensure the spinner is shown for at least 500ms
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            loadingTimeoutRef.current = setTimeout(() => {
                setLoading(false);
                console.log('useAnnotations: Set loading to false (isFetching false)');
            }, 500);
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [isFetching]);

    useEffect(() => {
        console.log('useAnnotations: useEffect triggered with dependencies:', { url, storage, storageLoading, did, userProfile });
        loadAnnotations();

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [loadAnnotations]);

    const handleSaveAnnotation = useCallback(
        async (content: string) => {
            if (storageLoading) {
                setError('Storage is still initializing');
                return;
            }

            if (!storage || !did) {
                setError(storage ? 'Not authenticated' : 'Storage not initialized');
                return;
            }

            try {
                setIsFetching(true);
                console.log('useAnnotations: Starting save annotation');
                const annotation: Annotation = {
                    id: `${did}-${Date.now()}`,
                    url,
                    content,
                    author: did,
                    timestamp: Date.now(),
                    comments: [],
                };

                console.log('useAnnotations: Saving annotation to storage:', annotation);
                await storage.saveAnnotation(annotation);
                const newDids = new Set<string>([did]);
                const newProfiles = await loadProfiles(newDids);
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save annotation:', err);
                setError('Failed to save annotation');
            } finally {
                setIsFetching(false);
            }
        },
        [storageLoading, storage, did, url]
    );

    const handleDeleteAnnotation = useCallback(
        async (id: string) => {
            if (storageLoading) {
                setError('Storage is still initializing');
                return;
            }

            if (!storage || !did) {
                setError(storage ? 'Not authenticated' : 'Storage not initialized');
                return;
            }

            try {
                setIsFetching(true);
                console.log('useAnnotations: Starting delete annotation');
                console.log('useAnnotations: Deleting annotation:', id);
                await storage.deleteAnnotation(url, id);
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to delete annotation:', err);
                setError('Failed to delete annotation');
            } finally {
                setIsFetching(false);
            }
        },
        [storageLoading, storage, did, url]
    );

    const handleSaveComment = useCallback(
        async (annotationId: string, content: string) => {
            if (storageLoading) {
                setError('Storage is still initializing');
                return;
            }

            if (!storage || !did) {
                setError(storage ? 'Not authenticated' : 'Storage not initialized');
                return;
            }

            try {
                setIsFetching(true);
                console.log('useAnnotations: Starting save comment');
                const comment: Comment = {
                    id: `${did}-${Date.now()}`,
                    content,
                    author: did,
                    timestamp: Date.now(),
                };

                console.log('useAnnotations: Saving comment to storage:', comment);
                await storage.saveComment(url, annotationId, comment);
                const newDids = new Set<string>([did]);
                const newProfiles = await loadProfiles(newDids);
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save comment:', err);
                setError('Failed to save comment');
            } finally {
                setIsFetching(false);
            }
        },
        [storageLoading, storage, did, url]
    );

    return {
        annotations,
        profiles,
        error: error || storageError,
        loading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
    };
};