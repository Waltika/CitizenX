// src/hooks/useAnnotations.ts
import { useState, useEffect } from 'react';
import { Annotation } from '../shared/types/annotation';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

interface UseAnnotationsResult {
    annotations: Annotation[];
    setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
    error: string | null;
    handleSaveAnnotation: (text: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
}

export const useAnnotations = (url: string, db: any, did: string | null): UseAnnotationsResult => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [error, setError] = useState<string | null>(null);

    console.log('Starting OrbitDB initialization for', url);
    const normalizedUrl = normalizeUrl(url);
    console.log('Normalized URL:', normalizedUrl);

    useEffect(() => {
        async function fetchAnnotations() {
            if (db) {
                try {
                    let localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                    console.log('Local annotations on init:', localAnnotations);
                    const validLocalAnnotations = localAnnotations.filter((doc: Annotation) => {
                        try {
                            normalizeUrl(doc.url);
                            return true;
                        } catch (e) {
                            console.warn('Removing annotation with invalid URL from localStorage:', doc.url, e);
                            return false;
                        }
                    });
                    if (localAnnotations.length !== validLocalAnnotations.length) {
                        console.warn('Invalid URLs detected in localStorage, cleaning up...');
                        localStorage.setItem('citizenx-annotations', JSON.stringify(validLocalAnnotations));
                        localAnnotations = validLocalAnnotations;
                    }

                    const filteredLocalAnnotations = did
                        ? localAnnotations.filter((doc: Annotation) => {
                            try {
                                const docNormalizedUrl = normalizeUrl(doc.url);
                                return docNormalizedUrl === normalizedUrl && doc.walletAddress && doc.walletAddress === did;
                            } catch (e) {
                                console.warn('Skipping annotation with invalid URL:', doc.url, e);
                                return false;
                            }
                        })
                        : [];
                    setAnnotations(filteredLocalAnnotations);

                    await new Promise<void>(async (resolve) => {
                        const docs = await db.all();
                        console.log('Initial OrbitDB docs:', docs);
                        for (const doc of docs) {
                            try {
                                normalizeUrl(doc.value.url);
                            } catch (e) {
                                console.warn('Removing OrbitDB doc with invalid URL:', doc.value.url, e);
                                try {
                                    await db.del(doc.hash);
                                    console.log('Deleted invalid doc from OrbitDB:', doc.hash);
                                } catch (deleteError) {
                                    console.error('Failed to delete invalid doc from OrbitDB:', deleteError);
                                }
                            }
                        }

                        db.events.on('update', async () => {
                            const updatedDocs = await db.all();
                            console.log('Initial update, annotations loaded:', updatedDocs);
                            const filteredDocs = did
                                ? updatedDocs.filter((doc: any) => {
                                    try {
                                        const docNormalizedUrl = normalizeUrl(doc.value.url);
                                        return docNormalizedUrl === normalizedUrl && doc.value.walletAddress && doc.value.walletAddress === did;
                                    } catch (e) {
                                        console.warn('Skipping OrbitDB doc with invalid URL:', doc.value.url, e);
                                        return false;
                                    }
                                })
                                : [];
                            setAnnotations(filteredDocs.map((doc: any) => doc.value));
                            resolve();
                        });
                    });

                    if (localAnnotations.length > 0) {
                        db.events.on('peer', async () => {
                            console.log('Peer connected, syncing localStorage annotations to OrbitDB');
                            for (const localDoc of localAnnotations) {
                                try {
                                    await db.put(localDoc);
                                    console.log('Synced local annotation to OrbitDB:', localDoc);
                                } catch (syncError) {
                                    console.error('Failed to sync local annotation:', syncError);
                                }
                            }
                            localStorage.removeItem('citizenx-annotations');
                            const updatedDocs = await db.all();
                            const filteredUpdatedDocs = did
                                ? updatedDocs.filter((doc: any) => {
                                    try {
                                        const docNormalizedUrl = normalizeUrl(doc.value.url);
                                        return docNormalizedUrl === normalizedUrl && doc.value.walletAddress && doc.value.walletAddress === did;
                                    } catch (e) {
                                        console.warn('Skipping OrbitDB doc with invalid URL:', doc.value.url, e);
                                        return false;
                                    }
                                })
                                : [];
                            setAnnotations(filteredUpdatedDocs.map((doc: any) => doc.value));
                        });
                    }

                    db.events.on('update', async () => {
                        const updatedDocs = await db.all();
                        console.log('Database updated, new docs:', updatedDocs);
                        const filteredUpdatedDocs = did
                            ? updatedDocs.filter((doc: any) => {
                                try {
                                    const docNormalizedUrl = normalizeUrl(doc.value.url);
                                    return docNormalizedUrl === normalizedUrl && doc.value.walletAddress && doc.value.walletAddress === did;
                                } catch (e) {
                                    console.warn('Skipping OrbitDB doc with invalid URL:', doc.value.url, e);
                                    return false;
                                }
                            })
                            : [];
                        setAnnotations(filteredUpdatedDocs.map((doc: any) => doc.value));
                        console.log('Annotations database updated:', filteredUpdatedDocs);
                    });
                } catch (fetchError) {
                    console.error('Failed to fetch annotations:', fetchError);
                    setError('Failed to load annotations');
                }
            } else {
                let localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                const validLocalAnnotations = localAnnotations.filter((doc: Annotation) => {
                    try {
                        normalizeUrl(doc.url);
                        return true;
                    } catch (e) {
                        console.warn('Removing annotation with invalid URL from localStorage:', doc.url, e);
                        return false;
                    }
                });
                if (localAnnotations.length !== validLocalAnnotations.length) {
                    console.warn('Invalid URLs detected in localStorage, cleaning up...');
                    localStorage.setItem('citizenx-annotations', JSON.stringify(validLocalAnnotations));
                    localAnnotations = validLocalAnnotations;
                }

                const filteredLocalAnnotations = did
                    ? localAnnotations.filter((doc: Annotation) => {
                        try {
                            const docNormalizedUrl = normalizeUrl(doc.url);
                            return docNormalizedUrl === normalizedUrl && doc.walletAddress && doc.walletAddress === did;
                        } catch (e) {
                            console.warn('Skipping annotation with invalid URL:', doc.url, e);
                            return false;
                        }
                    })
                    : [];
                setAnnotations(filteredLocalAnnotations);
            }
        }
        fetchAnnotations();
    }, [db, normalizedUrl, did]);

    const handleSaveAnnotation = async (text: string) => {
        if (!did) {
            setError('Please authenticate to save annotations.');
            return;
        }

        if (text.trim() && db) {
            const doc: Annotation = {
                _id: Date.now().toString(),
                url: normalizedUrl,
                text: text.trim(),
                timestamp: Date.now(),
                walletAddress: did, // Use did instead of walletAddress
            };
            try {
                await db.put(doc);
                console.log('Successfully saved to OrbitDB:', doc);
                const docs = await db.all();
                console.log('Annotations after save:', docs);
                const filteredDocs = docs.filter((d: any) => {
                    try {
                        const docNormalizedUrl = normalizeUrl(d.value.url);
                        return docNormalizedUrl === normalizedUrl && d.value.walletAddress && d.value.walletAddress === did;
                    } catch (e) {
                        console.warn('Skipping OrbitDB doc with invalid URL:', d.value.url, e);
                        return false;
                    }
                });
                setAnnotations(filteredDocs.map((d: any) => d.value));
            } catch (error: unknown) {
                const err = error as Error;
                if (err.message.includes('NoPeersSubscribedToTopic')) {
                    console.warn('No peers subscribed, saving to localStorage:', doc);
                    const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                    localAnnotations.push(doc);
                    localStorage.setItem('citizenx-annotations', JSON.stringify(localAnnotations));
                    const filteredLocalAnnotations = localAnnotations.filter((d: Annotation) => {
                        try {
                            const docNormalizedUrl = normalizeUrl(d.url);
                            return docNormalizedUrl === normalizedUrl && d.walletAddress && d.walletAddress === did;
                        } catch (e) {
                            console.warn('Skipping annotation with invalid URL:', d.url, e);
                            return false;
                        }
                    });
                    setAnnotations(filteredLocalAnnotations);
                    db.events.on('peer', async () => {
                        console.log('Peer connected, retrying save to OrbitDB');
                        try {
                            await db.put(doc);
                            console.log('Successfully saved to OrbitDB after peer connection:', doc);
                            localStorage.removeItem('citizenx-annotations');
                            const updatedDocs = await db.all();
                            const filteredUpdatedDocs = did
                                ? updatedDocs.filter((d: any) => {
                                    try {
                                        const docNormalizedUrl = normalizeUrl(d.value.url);
                                        return docNormalizedUrl === normalizedUrl && d.value.walletAddress && d.value.walletAddress === did;
                                    } catch (e) {
                                        console.warn('Skipping OrbitDB doc with invalid URL:', d.value.url, e);
                                        return false;
                                    }
                                })
                                : [];
                            setAnnotations(filteredUpdatedDocs.map((d: any) => d.value));
                        } catch (retryError) {
                            console.error('Retry failed:', retryError);
                        }
                    });
                } else {
                    console.error('Failed to save annotation:', err);
                    setError('Failed to save annotation');
                }
            }
        } else if (text.trim()) {
            const doc: Annotation = {
                _id: Date.now().toString(),
                url: normalizedUrl,
                text: text.trim(),
                timestamp: Date.now(),
                walletAddress: did!, // Use did instead of walletAddress
            };
            const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
            localAnnotations.push(doc);
            localStorage.setItem('citizenx-annotations', JSON.stringify(localAnnotations));
            const filteredLocalAnnotations = localAnnotations.filter((d: Annotation) => {
                try {
                    const docNormalizedUrl = normalizeUrl(d.url);
                    return docNormalizedUrl === normalizedUrl && d.walletAddress && d.walletAddress === did;
                } catch (e) {
                    console.warn('Skipping annotation with invalid URL:', d.url, e);
                    return false;
                }
            });
            setAnnotations(filteredLocalAnnotations);
        }
    };

    const handleDeleteAnnotation = async (id: string) => {
        if (db) {
            try {
                await db.del(id);
                console.log('Successfully deleted annotation from OrbitDB:', id);
                const docs = await db.all();
                const filteredDocs = did
                    ? docs.filter((d: any) => {
                        try {
                            const docNormalizedUrl = normalizeUrl(d.value.url);
                            return docNormalizedUrl === normalizedUrl && d.value.walletAddress && d.value.walletAddress === did;
                        } catch (e) {
                            console.warn('Skipping OrbitDB doc with invalid URL:', d.value.url, e);
                            return false;
                        }
                    })
                    : [];
                setAnnotations(filteredDocs.map((d: any) => d.value));
            } catch (error) {
                console.error('Failed to delete annotation:', error);
                setError('Failed to delete annotation');
            }
        } else {
            const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
            const updatedAnnotations = localAnnotations.filter((note: any) => note._id !== id);
            localStorage.setItem('citizenx-annotations', JSON.stringify(updatedAnnotations));
            const filteredUpdatedAnnotations = did
                ? updatedAnnotations.filter((d: Annotation) => {
                    try {
                        const docNormalizedUrl = normalizeUrl(d.url);
                        return docNormalizedUrl === normalizedUrl && d.walletAddress && d.walletAddress === did;
                    } catch (e) {
                        console.warn('Skipping annotation with invalid URL:', d.url, e);
                        return false;
                    }
                })
                : [];
            setAnnotations(filteredUpdatedAnnotations);
            console.warn('No peers subscribed, deleted from localStorage:', id);
        }
    };

    return { annotations, setAnnotations, error, handleSaveAnnotation, handleDeleteAnnotation };
};