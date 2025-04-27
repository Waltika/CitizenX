import { useState, useEffect, useCallback } from 'react';
import { useStorage } from './useStorage';
import { useUserProfile } from './useUserProfiles';
import { Annotation, Comment } from '../shared/types/annotation'; // Import from annotation.ts
import { Profile } from '../shared/types/userProfile'; // Import from userProfile.ts

interface UseAnnotationsProps {
    url: string;
    did: string | null;
}

interface UseAnnotationsReturn {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    error: string | null;
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
            return;
        }

        if (!storage || !did) {
            setAnnotations([]);
            setProfiles({});
            setError(storage ? 'Not authenticated' : 'Storage not initialized');
            console.log('useAnnotations: Not authenticated or storage not initialized', { storage: !!storage, did });
            return;
        }

        try {
            console.log('useAnnotations: Loading annotations for URL:', url);
            const loadedAnnotations = await storage.getAnnotations(url);
            console.log('useAnnotations: Loaded annotations:', loadedAnnotations);

            const dids = new Set<string>();
            loadedAnnotations.forEach((annotation) => {
                if (annotation.author) dids.add(annotation.author);
                annotation.comments?.forEach((comment) => {
                    if (comment.author) dids.add(comment.author);
                });
            });

            const profilesMap = await loadProfiles(dids);
            setAnnotations([...loadedAnnotations]);
            setProfiles(profilesMap);
            setError(null);
            console.log('useAnnotations: Profiles loaded:', profilesMap);
            console.log('useAnnotations: Annotations state updated:', loadedAnnotations);
        } catch (err) {
            console.error('useAnnotations: Failed to load annotations:', err);
            setError('Failed to load annotations');
            setAnnotations([]);
            setProfiles({});
        }
    }, [url, storage, storageLoading, did, userProfile]);

    useEffect(() => {
        console.log('useAnnotations: useEffect triggered with dependencies:', { url, storage, storageLoading, did, userProfile });
        loadAnnotations();
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
                setAnnotations((prev) => {
                    const updatedAnnotations = [...prev, annotation];
                    console.log('useAnnotations: Annotations state updated after save:', updatedAnnotations);
                    return updatedAnnotations;
                });

                const newDids = new Set<string>([did]);
                const newProfiles = await loadProfiles(newDids);
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save annotation:', err);
                setError('Failed to save annotation');
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
                console.log('useAnnotations: Deleting annotation:', id);
                await storage.deleteAnnotation(url, id);
                setAnnotations((prev) => {
                    const updatedAnnotations = prev.filter((annotation) => annotation.id !== id);
                    console.log('useAnnotations: Annotations state updated after delete:', updatedAnnotations);
                    return updatedAnnotations;
                });
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to delete annotation:', err);
                setError('Failed to delete annotation');
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
                const comment: Comment = {
                    id: `${did}-${Date.now()}`,
                    content,
                    author: did,
                    timestamp: Date.now(),
                };

                console.log('useAnnotations: Saving comment to storage:', comment);
                await storage.saveComment(url, annotationId, comment);

                setAnnotations((prev) => {
                    const updatedAnnotations = prev.map((annotation) =>
                        annotation.id === annotationId
                            ? { ...annotation, comments: [...(annotation.comments || []), comment] }
                            : annotation
                    );
                    console.log('useAnnotations: Annotations state updated after comment save:', updatedAnnotations);
                    return updatedAnnotations;
                });

                const newDids = new Set<string>([did]);
                const newProfiles = await loadProfiles(newDids);
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
                setError(null);
            } catch (err) {
                console.error('useAnnotations: Failed to save comment:', err);
                setError('Failed to save comment');
            }
        },
        [storageLoading, storage, did, url]
    );

    return {
        annotations,
        profiles,
        error: error || storageError,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
    };
};