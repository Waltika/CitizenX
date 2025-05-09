import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { Annotation, Comment, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { storage } from '../storage/StorageRepository';

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
    const annotationCache = useRef(new Map<string, Annotation>());
    const isFetchingRef = useRef<boolean>(false);

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
                if (annotationCache.current.has(annotationId)) {
                    const updatedAnnotation = {
                        ...annotationCache.current.get(annotationId)!,
                        comments: annotationCache.current.get(annotationId)!.comments.filter(c => c.id !== commentId)
                    };
                    annotationCache.current.set(annotationId, updatedAnnotation);
                    setAnnotations([...annotationCache.current.values()]);
                }
            }
        } catch (error : any) {
            console.error('Failed to delete comment:', error);
            setError('Failed to delete comment: ' + (error.message || 'Unknown error'));
        }
    }, [url, storage]);

    const fetchAnnotations = useCallback(async () => {
        if (!url || !storage || isFetchingRef.current) return;
        const normalizedUrl = normalizeUrl(url);
        isFetchingRef.current = true;
        setLoading(true);
        try {
            await new Promise<void>((resolve) => {
                storage.getAnnotations(normalizedUrl, (newAnnotations) => {
                    if (currentUrlRef.current !== normalizedUrl) {
                        console.log(`useAnnotations: Ignoring update for stale URL: ${normalizedUrl}`);
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
                    annotationCache.current = new Map(validAnnotations.map(a => [a.id, a]));
                    setAnnotations([...annotationCache.current.values()]);

                    if (validAnnotations.length === 0) {
                        console.log('useAnnotations: No annotations found, exiting loading state');
                        setLoading(false);
                        isFetchingRef.current = false;
                        resolve();
                        return;
                    }

                    const authorDids = new Set<string>();
                    validAnnotations.forEach(annotation => {
                        authorDids.add(annotation.author);
                        (annotation.comments || []).forEach(comment => authorDids.add(comment.author));
                    });

                    const profilePromises = Array.from(authorDids).map(did =>
                        storage.getProfile(did).then(profile => ({
                            did,
                            profile
                        }))
                    );

                    Promise.all(profilePromises).then(profileResults => {
                        if (currentUrlRef.current !== normalizedUrl) return;
                        const newProfiles = profileResults.reduce((acc: Record<string, Profile>, { did, profile }) => {
                            acc[did] = profile || { did, handle: 'Unknown' };
                            return acc;
                        }, {});
                        setProfiles(prev => ({ ...prev, ...newProfiles }));
                        setLoading(false);
                        isFetchingRef.current = false;
                        resolve();
                    }).catch(err => {
                        console.error('useAnnotations: Failed to fetch profiles:', err);
                        setError('Failed to fetch profiles: ' + (err.message || 'Unknown error'));
                        setLoading(false);
                        isFetchingRef.current = false;
                        resolve();
                    });
                });
                // Timeout to ensure callback is not stuck
                setTimeout(() => {
                    if (isFetchingRef.current) {
                        console.warn('useAnnotations: Fetch timeout, exiting loading state');
                        setLoading(false);
                        isFetchingRef.current = false;
                        resolve();
                    }
                }, 5000);
            });
        } catch (err : any) {
            if (currentUrlRef.current !== normalizedUrl) return;
            console.error('useAnnotations: Failed to fetch annotations:', err);
            setError('Failed to fetch annotations: ' + (err.message || 'Unknown error'));
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [url, storage]);

    useEffect(() => {
        setAnnotations([]);
        setProfiles({});
        setError(null);
        setLoading(false);
        annotationCache.current.clear();
        isFetchingRef.current = false;

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
            storage.cleanupAnnotationsListeners(normalizeUrl(url));
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentUrlRef.current = null;
            isFetchingRef.current = false;
        };
    }, [url, storage, storageLoading]);

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
            annotationCache.current.set(annotation.id, annotation);
            setAnnotations([...annotationCache.current.values()]);
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
            annotationCache.current.delete(annotationId);
            setAnnotations([...annotationCache.current.values()]);
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
            if (annotationCache.current.has(annotationId)) {
                const updatedAnnotation = {
                    ...annotationCache.current.get(annotationId)!,
                    comments: [...(annotationCache.current.get(annotationId)!.comments || []), comment]
                };
                annotationCache.current.set(annotationId, updatedAnnotation);
                setAnnotations([...annotationCache.current.values()]);
            }
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