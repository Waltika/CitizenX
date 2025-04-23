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

    useEffect(() => {
        async function initProfilesDB() {
            try {
                console.log('useUserProfiles: Current DID:', did);
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
                console.log('IPFS initialized for user profiles:', ipfs.isOnline() ? 'e2e' : 'offline');

                const orbitdb = await createOrbitDB({ ipfs });
                const database = await orbitdb.open('citizenx-profiles', { type: 'documents' });
                await database.load();
                console.log('User profiles database opened:', database);

                setDb(database);

                // Load profiles from localStorage as a fallback
                const localProfiles = localStorage.getItem('citizenx-profiles');
                console.log('useUserProfiles: Raw localStorage profiles:', localProfiles);
                const parsedLocalProfiles = localProfiles ? JSON.parse(localProfiles) : [];
                console.log('useUserProfiles: Parsed localStorage profiles:', parsedLocalProfiles);

                // Load profiles from OrbitDB
                const allDocs = await database.all();
                const orbitdbProfiles = allDocs.map((doc: any) => doc.value);
                console.log('useUserProfiles: OrbitDB profiles:', orbitdbProfiles);

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
                console.error('useUserProfiles: Failed to initialize user profiles database:', err);
                setError('Failed to load user profiles');
            }
        }

        initProfilesDB();

        return () => {
            if (db) {
                db.close();
            }
        };
    }, []);

    useEffect(() => {
        if (!db) return;

        db.events.on('update', async () => {
            const allDocs = await db.all();
            const orbitdbProfiles = allDocs.map((doc: any) => doc.value);
            console.log('useUserProfiles: Updated OrbitDB profiles:', orbitdbProfiles);

            const localProfiles = localStorage.getItem('citizenx-profiles');
            const parsedLocalProfiles = localProfiles ? JSON.parse(localProfiles) : [];

            const combinedProfiles = [...parsedLocalProfiles, ...orbitdbProfiles];
            const uniqueProfiles = Array.from(new Map(combinedProfiles.map((p: Profile) => [p._id, p])).values());
            const profilesMap = uniqueProfiles.reduce((acc: { [did: string]: { handle: string; profilePicture: string } }, profile: Profile) => {
                acc[profile._id] = {
                    handle: profile.handle,
                    profilePicture: profile.profilePicture,
                };
                return acc;
            }, {});
            console.log('useUserProfiles: Updated combined profiles map:', profilesMap);
            setProfiles(profilesMap);
        });
    }, [db]);

    return { profiles, error };
};