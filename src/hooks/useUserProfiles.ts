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
import { UserProfile } from '../shared/types/userProfile';

interface UseUserProfilesResult {
    profiles: Map<string, UserProfile>;
    createProfile: (handle: string, profilePicture: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture: string) => Promise<void>;
    error: string | null;
}

export const useUserProfiles = (did: string | null): UseUserProfilesResult => {
    const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [db, setDb] = useState<any>(null);

    useEffect(() => {
        async function initUserProfilesDB() {
            try {
                console.log('Initializing user profiles database...');
                const ipfs = await createHelia({
                    libp2p: {
                        transports: [
                            webSockets(),
                            webRTC(),
                            circuitRelayTransport(),
                        ],
                        transportManager: {
                            faultTolerance: FaultTolerance.NO_FATAL,
                        },
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
                ipfs.libp2p.addEventListener('peer:connect', (event) => {
                    console.log('Connected to peer:', event.detail.toString());
                });
                ipfs.libp2p.addEventListener('peer:disconnect', (event) => {
                    console.log('Disconnected from peer:', event.detail.toString());
                });
                console.log('IPFS initialized for user profiles:', ipfs);
                const orbitdb = await createOrbitDB({ ipfs });
                const userProfilesDb = await orbitdb.open('citizenx-user-profiles', { type: 'documents' });
                console.log('User profiles database opened:', userProfilesDb);
                setDb(userProfilesDb);

                // Fetch initial profiles
                const allDocs = await userProfilesDb.all();
                const profilesMap = new Map<string, UserProfile>();
                allDocs.forEach((doc: any) => {
                    profilesMap.set(doc.value._id, doc.value);
                });
                setProfiles(profilesMap);

                // Listen for updates
                userProfilesDb.events.on('update', async () => {
                    const updatedDocs = await userProfilesDb.all();
                    const updatedProfilesMap = new Map<string, UserProfile>();
                    updatedDocs.forEach((doc: any) => {
                        updatedProfilesMap.set(doc.value._id, doc.value);
                    });
                    setProfiles(updatedProfilesMap);
                    console.log('User profiles updated:', updatedProfilesMap);
                });
            } catch (err) {
                console.error('Failed to initialize user profiles database:', err);
                setError('Failed to initialize user profiles database');
            }
        }
        initUserProfilesDB();
    }, []);

    const createProfile = async (handle: string, profilePicture: string) => {
        if (!db || !did) {
            throw new Error('Database not initialized or user not authenticated');
        }
        const profile: UserProfile = {
            _id: did,
            handle,
            profilePicture,
        };
        await db.put(profile);
        console.log('User profile created:', profile);
    };

    const updateProfile = async (handle: string, profilePicture: string) => {
        if (!db || !did) {
            throw new Error('Database not initialized or user not authenticated');
        }
        const existingProfile = await db.get(did);
        if (!existingProfile) {
            throw new Error('User profile not found');
        }
        const updatedProfile: UserProfile = {
            ...existingProfile,
            handle,
            profilePicture,
        };
        await db.put(updatedProfile);
        console.log('User profile updated:', updatedProfile);
    };

    return { profiles, createProfile, updateProfile, error };
};