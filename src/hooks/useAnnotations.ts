import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { Annotation, Comment, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { storage as storageInstance } from '../storage/StorageRepository';

interface UseAnnotationsProps {
    url: string;
    did: string | null;
    tabId?: number;
}

interface UseAnnotationsResult {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string, tabId?: number) => Promise<void>;
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
    const isFetchingRef = useRef<boolean>(false);
    const hasReceivedDataRef = useRef<boolean>(false);

    const handleDeleteComment = useCallback(async (annotationId: string, commentId: string) => {
        if (!storage) {
            console.error('Storage not initialized for comment deletion');
            throw new Error('Storage not initialized');
        }
        if (!url) {
            console.error('No URL provided for comment deletion');
            throw new Error('No URL provided for comment deletion');
        }
        try {
            await storage.deleteComment(normalizeUrl(url), annotationId, commentId);
            if (currentUrlRef.current === normalizeUrl(url)) {
                setAnnotations(prev =>
                    prev.map(a =>
                        a.id === annotationId
                            ? { ...a, comments: a.comments.filter(c => c.id !== commentId) }
                            : a
                    )
                );
            }
        } catch (error) {
            console.error('Failed to delete comment:', error);
            setError('Failed to delete comment: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }, [url, storage]);

    const updateAnnotations = useCallback((newAnnotations: Annotation[]) => {
        if (currentUrlRef.current !== normalizeUrl(url)) {
            console.log(`useAnnotations: Ignoring update for stale URL: ${url}`);
            return;
        }
        const validAnnotations = newAnnotations.filter(
            a => !a.isDeleted && a.id && a.author && a.content && a.author.startsWith('did:')
        ).map(a => ({
            ...a,
            comments: a.comments ? a.comments.filter(
                c => !c.isDeleted && c.id && c.author && c.content && c.author.startsWith('did:')
            ) : []
        }));
        setAnnotations(validAnnotations);
        hasReceivedDataRef.current = true;

        if (validAnnotations.length === 0) {
            console.log('useAnnotations: No annotations found, exiting loading state');
            setLoading(false);
            isFetchingRef.current = false;
            return;
        }

        const authorDids = new Set<string>();
        validAnnotations.forEach(annotation => {
            authorDids.add(annotation.author);
            (annotation.comments || []).forEach(comment => authorDids.add(comment.author));
        });

        Promise.all(
            Array.from(authorDids).map(did =>
                new Promise<{ did: string; profile: Profile | null }>((resolve) => {
                    chrome.storage.local.get([`profile_${did}`], (result) => {
                        if (result[`profile_${did}`]) {
                            resolve({ did, profile: result[`profile_${did}`] });
                        } else if (storage) {
                            storage.getProfile(did).then(profile => {
                                if (profile) {
                                    chrome.storage.local.set({ [`profile_${did}`]: profile });
                                }
                                resolve({ did, profile });
                            }).catch(() => resolve({ did, profile: null }));
                        } else {
                            resolve({ did, profile: null });
                        }
                    });
                })
            )
        ).then(profileResults => {
            if (currentUrlRef.current !== normalizeUrl(url)) return;
            const newProfiles = profileResults.reduce((acc: Record<string, Profile>, { did, profile }) => {
                acc[did] = profile || { did, handle: 'Unknown' };
                return acc;
            }, {});
            setProfiles(prev => ({ ...prev, ...newProfiles }));
            setLoading(false);
            isFetchingRef.current = false;
        }).catch(err => {
            console.error('useAnnotations: Failed to fetch profiles:', err);
            setError('Failed to fetch profiles: ' + (err instanceof Error ? err.message : 'Unknown error'));
            setLoading(false);
            isFetchingRef.current = false;
        });
    }, [url, storage]);

    const fetchAnnotations = useCallback(async () => {
        if (!url || !storage || isFetchingRef.current) return;
        const normalizedUrl = normalizeUrl(url);
        isFetchingRef.current = true;
        setLoading(true);
        try {
            // Initial fetch
            const initialAnnotations = await storage.getAnnotations(normalizedUrl);
            if (initialAnnotations.length > 0) {
                updateAnnotations(initialAnnotations);
            }

            // Real-time subscription
            storage.getAnnotations(normalizedUrl, (newAnnotations) => {
                updateAnnotations(newAnnotations);
            });

            // Timeout to ensure loading doesn't persist if no data is received
            setTimeout(() => {
                if (isFetchingRef.current && !hasReceivedDataRef.current) {
                    console.log('useAnnotations: No data received after timeout, exiting loading state');
                    setLoading(false);
                    isFetchingRef.current = false;
                }
            }, 3000);
        } catch (err) {
            if (currentUrlRef.current !== normalizedUrl) return;
            console.error('useAnnotations: Failed to fetch annotations:', err);
            setError('Failed to fetch annotations: ' + (err instanceof Error ? err.message : 'Unknown error'));
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [url, storage, updateAnnotations]);

    useEffect(() => {
        setAnnotations([]);
        setProfiles({});
        setError(null);
        setLoading(false);
        isFetchingRef.current = false;
        hasReceivedDataRef.current = false;

        if (!url) {
            console.log('useAnnotations: No URL provided, skipping fetch');
            return;
        }

        if (storageLoading || !storage) {
            console.log('useAnnotations: Waiting for storage to initialize');
            setLoading(true);
            return;
        }

        currentUrlRef.current = normalizeUrl(url);
        fetchAnnotations();

        return () => {
            console.log('useAnnotations: Cleaning up for URL:', currentUrlRef.current);
            storageInstance.cleanupAnnotationsListeners(normalizeUrl(url));
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentUrlRef.current = null;
            isFetchingRef.current = false;
        };
    }, [url, storage, storageLoading, fetchAnnotations]);

    const handleSaveAnnotation = useCallback(async (content: string, saveTabId?: number) => {
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

        await storage.saveAnnotation(annotation, saveTabId || tabId);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations(prev => [...prev, annotation]);
        }
    }, [did, url, storage, tabId]);

    const handleDeleteAnnotation = useCallback(async (annotationId: string) => {
        if (!storage) {
            throw new Error('Storage not initialized');
        }
        if (!url) {
            throw new Error('No URL provided for deletion');
        }

        await storage.deleteAnnotation(normalizeUrl(url), annotationId);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations(prev => prev.filter(a => a.id !== annotationId));
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

        await storage.saveComment(normalizeUrl(url), annotationId, comment);
        if (currentUrlRef.current === normalizeUrl(url)) {
            setAnnotations(prev =>
                prev.map(a =>
                    a.id === annotationId
                        ? { ...a, comments: [...(a.comments || []), comment] }
                        : a
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
        handleDeleteComment,
    };
};