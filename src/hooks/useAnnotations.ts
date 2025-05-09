import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './useStorage';
import { Annotation, Comment, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { storage as storageInstance, StorageRepository } from '../storage/StorageRepository';

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

interface PendingAnnotation {
    tempId: string;
    content: string;
    timestamp: number;
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}

export const useAnnotations = ({ url, did, tabId }: UseAnnotationsProps): UseAnnotationsResult => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [profiles, setProfiles] = useState<Record<string, Profile>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [pendingAnnotations, setPendingAnnotations] = useState<PendingAnnotation[]>([]);
    const currentUrlRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isFetchingRef = useRef<boolean>(false);
    const hasReceivedDataRef = useRef<boolean>(false);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const subscriptionPromiseRef = useRef<Promise<void> | null>(null);

    const handleDeleteComment = useCallback(async (annotationId: string, commentId: string) => {
        console.log('useAnnotations: handleDeleteComment called - annotationId:', annotationId, 'commentId:', commentId);
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
        console.log('useAnnotations: updateAnnotations called - newAnnotations:', newAnnotations.length);
        if (currentUrlRef.current !== normalizeUrl(url)) {
            console.log(`useAnnotations: Ignoring update for stale URL: ${url}`);
            return;
        }

        // Deduplicate annotations and comments
        const seenAnnotations = new Map<string, Annotation>();
        const deduplicatedAnnotations = newAnnotations.reduce((acc: Annotation[], annotation: any) => {
            const isValid =
                annotation &&
                typeof annotation === 'object' &&
                !annotation.isDeleted &&
                annotation.id &&
                typeof annotation.id === 'string' &&
                annotation.author &&
                typeof annotation.author === 'string' &&
                annotation.author.startsWith('did:') &&
                annotation.content &&
                typeof annotation.content === 'string';

            if (!isValid) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`useAnnotations: Skipping invalid annotation:`, annotation);
                }
                return acc;
            }

            // Skip duplicates by ID
            if (seenAnnotations.has(annotation.id)) return acc;

            // Deduplicate comments within the annotation
            const comments = annotation.comments || [];
            const seenComments = new Map<string, any>();
            const uniqueComments = comments.filter((c: any) => {
                const isValidComment =
                    c &&
                    typeof c === 'object' &&
                    !c.isDeleted &&
                    c.id &&
                    typeof c.id === 'string' &&
                    c.author &&
                    typeof c.author === 'string' &&
                    c.author.startsWith('did:') &&
                    c.content &&
                    typeof c.content === 'string';
                if (!isValidComment) {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`useAnnotations: Skipping invalid comment:`, c);
                    }
                    return false;
                }

                if (seenComments.has(c.id)) return false;

                const key = `${c.content}-${c.timestamp}`;
                if (seenComments.has(key)) return false;

                seenComments.set(c.id, c);
                seenComments.set(key, c);
                return true;
            });

            const deduplicatedAnnotation = { ...annotation, comments: uniqueComments };
            seenAnnotations.set(annotation.id, deduplicatedAnnotation);
            acc.push(deduplicatedAnnotation);
            return acc;
        }, []);

        setAnnotations(deduplicatedAnnotations);
        hasReceivedDataRef.current = true;

        if (deduplicatedAnnotations.length === 0) {
            setLoading(false);
            isFetchingRef.current = false;
            return;
        }

        const authorDids = new Set<string>();
        deduplicatedAnnotations.forEach(annotation => {
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
    }, [url, storage]); // Removed pendingAnnotations from dependencies

    const debouncedUpdateAnnotations = useCallback(
        debounce((newAnnotations: Annotation[]) => {
            updateAnnotations(newAnnotations);
        }, 1500),
        [updateAnnotations]
    );

    const fetchAnnotations = useCallback(async () => {
        console.log('useAnnotations: fetchAnnotations called - url:', url);
        if (!url || !storage || isFetchingRef.current) return;
        const normalizedUrl = normalizeUrl(url);
        isFetchingRef.current = true;
        setLoading(true);

        if (unsubscribeRef.current) {
            if (typeof unsubscribeRef.current === 'function') {
                unsubscribeRef.current();
            }
            unsubscribeRef.current = null;
        }

        try {
            const initialAnnotations = await storage.getAnnotations(normalizedUrl);
            if (initialAnnotations.length > 0) {
                updateAnnotations(initialAnnotations);
            }

            const subscriptionPromise = storage.getAnnotations(normalizedUrl, (newAnnotations) => {
                debouncedUpdateAnnotations(newAnnotations);
            }).then(unsubscribe => {
                unsubscribeRef.current = unsubscribe;
            }).catch(err => {
                console.error('useAnnotations: Failed to establish GUN subscription:', err);
                setError('Failed to connect to GUN: ' + (err instanceof Error ? err.message : 'Unknown error'));
                setLoading(false);
                isFetchingRef.current = false;
            });
            subscriptionPromiseRef.current = subscriptionPromise;

            setTimeout(() => {
                if (isFetchingRef.current && !hasReceivedDataRef.current) {
                    setLoading(false);
                    isFetchingRef.current = false;
                    setError('Timeout: Unable to fetch annotations');
                }
            }, 5000); // Increased timeout to 5 seconds
        } catch (err) {
            if (currentUrlRef.current !== normalizedUrl) return;
            console.error('useAnnotations: Failed to fetch annotations:', err);
            setError('Failed to fetch annotations: ' + (err instanceof Error ? err.message : 'Unknown error'));
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [url, storage, debouncedUpdateAnnotations]);

    useEffect(() => {
        console.log('useAnnotations: useEffect for fetchAnnotations - url:', url, 'storageLoading:', storageLoading);
        if (!url) return;

        if (storageLoading || !storage) {
            setLoading(true);
            return;
        }

        currentUrlRef.current = normalizeUrl(url);
        fetchAnnotations();

        return () => {
            if (subscriptionPromiseRef.current) {
                subscriptionPromiseRef.current.then(() => {
                    if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
                        unsubscribeRef.current();
                    }
                    unsubscribeRef.current = null;
                }).catch(err => {
                    console.error('useAnnotations: Error during subscription cleanup:', err);
                });
            } else {
                if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
                    unsubscribeRef.current();
                }
                unsubscribeRef.current = null;
            }
            subscriptionPromiseRef.current = null;
            storageInstance.cleanupAnnotationsListeners(normalizeUrl(url));
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            currentUrlRef.current = null;
            isFetchingRef.current = false;
            hasReceivedDataRef.current = false;
        };
    }, [url, storage, storageLoading]); // Removed fetchAnnotations from dependencies

    useEffect(() => {
        // Reset state only when URL changes, but not in a way that triggers re-fetch
        setAnnotations([]);
        setProfiles({});
        setError(null);
        setPendingAnnotations([]);
    }, [url]);

    const handleSaveAnnotation = useCallback(async (content: string, saveTabId?: number) => {
        console.log('useAnnotations: handleSaveAnnotation called - content:', content);
        if (!did) {
            throw new Error('User not authenticated');
        }
        if (!storage) {
            throw new Error('Storage not initialized');
        }
        if (!url) {
            throw new Error('No URL provided for annotation');
        }

        const timestamp = Date.now();
        const tempId = `temp-${timestamp}`;
        const pendingAnnotation: PendingAnnotation = {
            tempId,
            content,
            timestamp,
        };

        setPendingAnnotations(prev => [...prev, pendingAnnotation]);

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

        try {
            await storage.saveAnnotation(annotation, saveTabId || tabId);
            setPendingAnnotations(prev => prev.filter(pa => pa.tempId !== tempId));
        } catch (error) {
            console.error('useAnnotations: Failed to save annotation:', error);
            setPendingAnnotations(prev => prev.filter(pa => pa.tempId !== tempId));
            throw error;
        }
    }, [did, url, storage, tabId]);

    const handleDeleteAnnotation = useCallback(async (annotationId: string) => {
        console.log('useAnnotations: handleDeleteAnnotation called - annotationId:', annotationId);
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
        console.log('useAnnotations: handleSaveComment called - annotationId:', annotationId, 'content:', content);
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