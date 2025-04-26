// src/hooks/useAnnotations.ts
import { useState, useEffect } from 'react';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { useOrbitDB } from './useOrbitDB';
import { Annotation } from '../shared/types/annotation';

interface UseAnnotationsProps {
    url: string;
    db: any;
    did: string | null;
    isReady: boolean;
}

interface UseAnnotationsResult {
    annotations: Annotation[];
    loading: boolean;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}

export function useAnnotations({ url, db, did, isReady }: UseAnnotationsProps): UseAnnotationsResult {
    const [allEntries, setAllEntries] = useState<Annotation[]>([]);
    const [loading, setLoading] = useState(true);
    const normalizedUrl = normalizeUrl(url) || ''; // Fallback to empty string

    useEffect(() => {
        if (!isReady) return; // Wait for database to initialize

        console.log('useAnnotations: Normalized URL:', normalizedUrl);
        if (!normalizedUrl || normalizedUrl.startsWith('chrome://')) {
            console.warn('useAnnotations: Invalid URL for annotations, skipping database fetch:', normalizedUrl);
            setAllEntries([]);
            setLoading(false);
            return;
        }

        // Load entries from localStorage as a fallback
        const localEntries = localStorage.getItem('citizenx-annotations');
        const parsedEntries: Annotation[] = localEntries ? JSON.parse(localEntries) : [];
        console.log('useAnnotations: Parsed localStorage entries:', parsedEntries);
        const filteredEntries = parsedEntries.filter((entry) => entry.url === normalizedUrl);
        setAllEntries(filteredEntries);

        // Fetch entries from OrbitDB if the database is ready
        if (db) {
            (async () => {
                try {
                    const orbitdbEntries: Annotation[] = [];
                    for await (const doc of db.iterator()) {
                        orbitdbEntries.push(doc);
                    }
                    console.log('useAnnotations: OrbitDB entries:', orbitdbEntries);
                    const updatedEntries = [...parsedEntries, ...orbitdbEntries];
                    const uniqueEntries = Array.from(new Map(updatedEntries.map((entry) => [entry._id, entry])).values());
                    setAllEntries(uniqueEntries.filter((entry) => entry.url === normalizedUrl));
                    localStorage.setItem('citizenx-annotations', JSON.stringify(uniqueEntries));
                    console.log('useAnnotations: Updated localStorage entries:', uniqueEntries);

                    // Sync pending operations from background.js
                    chrome.runtime.sendMessage({ action: 'syncPending' }, async (response: { pending?: { annotations: any[] } }) => {
                        if (response.pending) {
                            console.log('useAnnotations: Syncing pending operations:', response.pending);
                            const { annotations: pendingEntries } = response.pending;
                            for (const operation of pendingEntries) {
                                if (operation.action === 'putAnnotation') {
                                    try {
                                        await db.put(operation.data);
                                        console.log('useAnnotations: Applied pending entry:', operation.data);
                                    } catch (err) {
                                        console.error('useAnnotations: Failed to apply pending entry:', err);
                                    }
                                }
                            }
                            // Refresh entries after syncing
                            const syncedEntries: Annotation[] = [];
                            for await (const doc of db.iterator()) {
                                syncedEntries.push(doc);
                            }
                            console.log('useAnnotations: Entries after syncing:', syncedEntries);
                            const finalEntries = [...uniqueEntries, ...syncedEntries];
                            const finalUniqueEntries = Array.from(new Map(finalEntries.map((entry) => [entry._id, entry])).values());
                            setAllEntries(finalUniqueEntries.filter((entry) => entry.url === normalizedUrl));
                            localStorage.setItem('citizenx-annotations', JSON.stringify(finalUniqueEntries));
                            console.log('useAnnotations: Final entries in localStorage after sync:', finalUniqueEntries);
                        } else {
                            console.log('useAnnotations: No pending operations to sync');
                        }
                    });
                } catch (err) {
                    console.error('useAnnotations: Failed to fetch entries from OrbitDB:', err);
                }
            })();
        }

        setLoading(false);
    }, [normalizedUrl, db, isReady]);

    // Separate useEffect for polling localStorage
    useEffect(() => {
        if (!normalizedUrl || normalizedUrl.startsWith('chrome://')) return;

        const interval = setInterval(() => {
            console.log('useAnnotations: Polling localStorage for updates...');
            const updatedLocalEntries = localStorage.getItem('citizenx-annotations');
            const parsedUpdatedEntries: Annotation[] = updatedLocalEntries ? JSON.parse(updatedLocalEntries) : [];
            if (JSON.stringify(parsedUpdatedEntries) !== JSON.stringify(allEntries)) {
                console.log('useAnnotations: LocalStorage entries updated:', parsedUpdatedEntries);
                setAllEntries(parsedUpdatedEntries.filter((entry) => entry.url === normalizedUrl));
            }
        }, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [normalizedUrl, allEntries]);

    // Heartbeat to keep background.js informed of side panel activity
    useEffect(() => {
        const heartbeatInterval = setInterval(() => {
            chrome.runtime.sendMessage({ action: 'heartbeat' }, (response: any) => {
                if (chrome.runtime.lastError) {
                    console.error('Heartbeat failed:', chrome.runtime.lastError);
                }
            });
        }, 4000);

        return () => clearInterval(heartbeatInterval);
    }, []);

    const addEntry = async (entry: Annotation) => {
        if (!normalizedUrl || normalizedUrl.startsWith('chrome://')) {
            console.warn('useAnnotations: Invalid URL for annotations, cannot save entry:', normalizedUrl);
            return;
        }

        if (!db || !isReady) {
            // Database is not initialized; cache the operation
            console.log('useAnnotations: Database not ready, caching entry:', entry);
            return new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'putAnnotation', annotation: entry }, (response: any) => {
                    if (response.success) {
                        const updatedEntries = [...allEntries, entry];
                        setAllEntries(updatedEntries);
                        localStorage.setItem('citizenx-annotations', JSON.stringify(updatedEntries));
                        console.log('useAnnotations: Cached entry, updated entries:', updatedEntries);
                        resolve();
                    } else {
                        console.error('useAnnotations: Failed to cache entry:', response.error);
                        reject(new Error(response.error));
                    }
                });
            });
        }

        // Database is open; save directly to OrbitDB
        console.log('useAnnotations: Saving entry to OrbitDB:', entry);
        try {
            await db.put(entry);
            const updatedEntries = [...allEntries, entry];
            setAllEntries(updatedEntries);
            localStorage.setItem('citizenx-annotations', JSON.stringify(updatedEntries));
            console.log('useAnnotations: Saved entry to OrbitDB, updated entries:', updatedEntries);
        } catch (err) {
            console.error('useAnnotations: Failed to save entry to OrbitDB:', err);
            // Fallback to caching if OrbitDB fails
            await chrome.runtime.sendMessage({ action: 'putAnnotation', annotation: entry });
            const updatedEntries = [...allEntries, entry];
            setAllEntries(updatedEntries);
            localStorage.setItem('citizenx-annotations', JSON.stringify(updatedEntries));
            console.log('useAnnotations: OrbitDB save failed, cached entry:', updatedEntries);
        }
    };

    const handleSaveAnnotation = async (content: string) => {
        if (!did) {
            console.warn('useAnnotations: User not authenticated, cannot save annotation');
            return;
        }
        const timestamp = Date.now();
        const annotation: Annotation = {
            _id: `${did}-${timestamp}`,
            url: normalizedUrl,
            text: content,
            did,
            timestamp,
            source: db && isReady ? 'orbitdb' : 'local',
            comments: [],
        };
        await addEntry(annotation);
    };

    const handleDeleteAnnotation = async (id: string) => {
        // Note: Deletion is not fully implemented; update local state only
        const updatedEntries = allEntries.filter((entry) => entry._id !== id);
        setAllEntries(updatedEntries);
        localStorage.setItem('citizenx-annotations', JSON.stringify(updatedEntries));
    };

    const handleSaveComment = async (annotationId: string, content: string) => {
        if (!did) {
            console.warn('useAnnotations: User not authenticated, cannot save comment');
            return;
        }
        const timestamp = Date.now();
        const comment: Annotation = {
            _id: `${did}-${timestamp}`,
            url: normalizedUrl,
            text: content,
            did,
            timestamp,
            source: db && isReady ? 'orbitdb' : 'local',
            comments: [],
            annotationId,
        };
        await addEntry(comment);

        // Update the parent annotation to include the comment
        const updatedEntries = allEntries.map((entry) => {
            if (entry._id === annotationId) {
                return { ...entry, comments: [...(entry.comments || []), comment] };
            }
            return entry;
        });
        setAllEntries(updatedEntries);
        localStorage.setItem('citizenx-annotations', JSON.stringify(updatedEntries));
    };

    // Filter top-level annotations (those without annotationId) for the result
    const annotations = allEntries.filter((entry) => !entry.annotationId);

    return {
        annotations,
        loading,
        handleSaveAnnotation,
        handleDeleteAnnotation,
        handleSaveComment,
    };
}