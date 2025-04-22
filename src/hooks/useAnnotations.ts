// src/hooks/useAnnotations.ts
import { useState, useEffect } from 'react';

interface Annotation {
    _id: string;
    url: string;
    text: string;
    timestamp: number;
}

interface UseAnnotationsResult {
    annotations: Annotation[];
    setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
    error: string | null;
    handleSaveAnnotation: (text: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
}

export const useAnnotations = (url: string, db: any): UseAnnotationsResult => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Fetch annotations on mount or when db changes
    useEffect(() => {
        async function fetchAnnotations() {
            if (db) {
                try {
                    // Load annotations from localStorage first
                    const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                    console.log('Local annotations on init:', localAnnotations);
                    setAnnotations(localAnnotations);

                    // Wait for the initial update event to ensure the database is fully loaded
                    await new Promise<void>((resolve) => {
                        db.events.on('update', async () => {
                            const docs = await db.all();
                            console.log('Initial update, annotations loaded:', docs);
                            setAnnotations(docs.map((doc: any) => doc.value));
                            resolve();
                        });
                    });

                    // Try to sync localStorage annotations to OrbitDB if peers are available
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
                            setAnnotations(updatedDocs.map((doc: any) => doc.value));
                        });
                    }

                    db.events.on('update', async () => {
                        const updatedDocs = await db.all();
                        console.log('Database updated, new docs:', updatedDocs);
                        setAnnotations(updatedDocs.map((doc: any) => doc.value));
                        console.log('Annotations database updated:', updatedDocs);
                    });
                } catch (fetchError) {
                    console.error('Failed to fetch annotations:', fetchError);
                    setError('Failed to load annotations');
                }
            }
        }
        fetchAnnotations();
    }, [db]);

    const handleSaveAnnotation = async (text: string) => {
        if (text.trim() && db) {
            const doc = {
                _id: Date.now().toString(),
                url,
                text: text.trim(),
                timestamp: Date.now(),
            };
            try {
                await db.put(doc);
                console.log('Successfully saved to OrbitDB:', doc);
                const docs = await db.all();
                console.log('Annotations after save:', docs);
                setAnnotations(docs.map((d: any) => d.value));
            } catch (error: unknown) {
                const err = error as Error;
                if (err.message.includes('NoPeersSubscribedToTopic')) {
                    console.warn('No peers subscribed, saving to localStorage:', doc);
                    const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                    localAnnotations.push(doc);
                    localStorage.setItem('citizenx-annotations', JSON.stringify(localAnnotations));
                    setAnnotations(localAnnotations);
                    db.events.on('peer', async () => {
                        console.log('Peer connected, retrying save to OrbitDB');
                        try {
                            await db.put(doc);
                            console.log('Successfully saved to OrbitDB after peer connection:', doc);
                            localStorage.removeItem('citizenx-annotations');
                            const updatedDocs = await db.all();
                            setAnnotations(updatedDocs.map((d: any) => d.value));
                        } catch (retryError) {
                            console.error('Retry failed:', retryError);
                        }
                    });
                } else {
                    console.error('Failed to save annotation:', err);
                    setError('Failed to save annotation');
                }
            }
        }
    };

    const handleDeleteAnnotation = async (id: string) => {
        if (db) {
            try {
                await db.del(id);
                console.log('Successfully deleted annotation from OrbitDB:', id);
                const docs = await db.all();
                setAnnotations(docs.map((d: any) => d.value));
            } catch (error) {
                console.error('Failed to delete annotation:', error);
                setError('Failed to delete annotation');
            }
        } else {
            const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
            const updatedAnnotations = localAnnotations.filter((note: any) => note._id !== id);
            localStorage.setItem('citizenx-annotations', JSON.stringify(updatedAnnotations));
            setAnnotations(updatedAnnotations);
            console.warn('No peers subscribed, deleted from localStorage:', id);
        }
    };

    return { annotations, setAnnotations, error, handleSaveAnnotation, handleDeleteAnnotation };
};