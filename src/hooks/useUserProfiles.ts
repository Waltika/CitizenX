// src/hooks/useUserProfiles.ts
import { useState, useEffect } from 'react';
import { createOrbitDB } from '@orbitdb/core';
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { FaultTolerance } from '@libp2p/interface';

interface Profile {
    _id: string; // DID
    handle: string;
    profilePicture: string;
}

interface UseUserProfilesResult {
    profiles: { [did: string]: { handle: string; profilePicture: string } };
    error: string | null;
}

export const useUserProfiles = (did: string | null): UseUserProfilesResult => {
    const [profiles, setProfiles] = useState<{ [did: string]: { handle: string; profilePicture: string } }>({});
    const [error, setError] = useState<string | null>(null);
    const [db, setDb] = useState<any>(null);

    const loadProfiles = async () => {
        try {
            console.log('useUserProfiles: Current DID:', did);

            // Load profiles from localStorage as a fallback
            const localProfiles = localStorage.getItem('citizenx-profiles');
            console.log('useUserProfiles: Raw localStorage profiles:', localProfiles);
            const parsedLocalProfiles = localProfiles ? JSON.parse(localProfiles) : [];
            console.log('useUserProfiles: Parsed localStorage profiles:', parsedLocalProfiles);

            // Load profiles from OrbitDB if db is available
            let orbitdbProfiles: Profile[] = [];
            if (db) {
                console.log('Fetching all documents from OrbitDB...');
                try {
                    const allDocsIterator = await db.all();
                    console.log('Result of database.all():', allDocsIterator);
                    console.log('Is iterator?', typeof allDocsIterator[Symbol.asyncIterator] === 'function');
                    for await (const doc of allDocsIterator) {
                        console.log('OrbitDB document:', doc);
                        orbitdbProfiles.push(doc.value);
                    }
                } catch (err) {
                    console.error('Failed to iterate over database.all():', err);
                    const allDocs = await db.get('');
                    orbitdbProfiles.push(...allDocs.map((doc: any) => doc.value));
                }
                console.log('useUserProfiles: OrbitDB profiles:', orbitdbProfiles);
            }

            // Merge profiles, prioritizing OrbitDB over localStorage
            const combinedProfiles = [...parsedLocalProfiles, ...orbitdbProfiles];
            const uniqueProfiles = Array.from(new Map(combinedProfiles.map((p: Profile) => [p._id, p])).values());
            const profilesMap = uniqueProfiles.reduce((acc: { [did: string]: { handle: string; profilePicture: string } }, profile: Profile) => {
                acc[profile._id] = {
                    handle: profile.handle,
                    profilePicture: profile.profilePicture,
                };
                return acc;
            }, {});
            console.log('useUserProfiles: Combined profiles map:', profilesMap);
            setProfiles(profilesMap);
        } catch (err) {
            console.error('useUserProfiles: Failed to load profiles:', err);
            setError('Failed to load user profiles');
        }
    };

    // Initialize OrbitDB and load profiles
    useEffect(() => {
        async function initProfilesDB() {
            try {
                console.log('Initializing user profiles database...');

                const ipfs = await createHelia({
                    libp2p: {
                        transports: [webSockets(), webRTC(), circuitRelayTransport()],
                        transportManager: { faultTolerance: FaultTolerance.NO_FATAL },
                        peerDiscovery: [
                            bootstrap({
                                list: [
                                    '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/12D3KooWQL1aS4qD3yCjmV7gNmx4F5gP7pNXG1qimV5DXe7tXUn',
                                    '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/12D3KooWAtfLqN4QmgjrZ9eZ9r4L1B7bH7d9eW8fA4n4bBAyKSm',
                                    '/dns4/relay.libp2p.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                    '/dns4/relay.ipfs.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                    '/dns4/relay.ipfs.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                ],
                            }),
                        ],
                        services: {
                            identify: identify(),
                            pubsub: gossipsub(),
                        },
                    },
                });
                console.log('IPFS initialized for user profiles:', ipfs);

                const orbitdb = await createOrbitDB({ ipfs });
                const database = await orbitdb.open('citizenx-profiles', { type: 'documents' });
                console.log('User profiles database opened:', database);

                // Wait for the database to be ready
                await new Promise<void>((resolve) => {
                    database.events.on('ready', () => {
                        console.log('Database ready:', database);
                        resolve();
                    });
                });

                setDb(database);

                // Load profiles immediately after DB is set
                await loadProfiles();
            } catch (err) {
                console.error('useUserProfiles: Failed to initialize user profiles database:', err);
                setError('Failed to initialize user profiles database');
                // Load profiles from localStorage even if OrbitDB fails
                await loadProfiles();
            }
        }

        initProfilesDB();

        return () => {
            if (db) {
                db.close();
            }
        };
    }, []);

    // Reload profiles whenever DID changes
    useEffect(() => {
        if (did) {
            loadProfiles();
        }
    }, [did]);

    // Poll localStorage for changes every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('useUserProfiles: Polling localStorage for profile updates...');
            loadProfiles();
        }, 5000);

        return () => clearInterval(interval);
    }, [db]); // Depend on db so polling starts after DB initialization

    // Handle OrbitDB updates
    useEffect(() => {
        if (!db) return;

        db.events.on('update', async () => {
            console.log('useUserProfiles: Database update event triggered');
            await loadProfiles();
        });
    }, [db]);

    return { profiles, error };
};