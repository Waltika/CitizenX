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
    loading: boolean;
    error: string | null;
}

export const useUserProfiles = (did: string | null): UseUserProfilesResult => {
    const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [db, setDb] = useState<any>(null);

    useEffect(() => {
        console.log('useUserProfiles: Current DID:', did);
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
                                    '/dns4/go-ipfs-bootstrap-1.ipfs.dwebops.pub/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZguyWvRmga5yW',
                                    '/dns4/go-ipfs-bootstrap-2.ipfs.dwebops.pub/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZguyWvRmga5yX',
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

                // Fetch initial profiles from OrbitDB
                const allDocs = await userProfilesDb.all();
                const profilesMap = new Map<string, UserProfile>();
                allDocs.forEach((doc: any) => {
                    profilesMap.set(doc.value._id, doc.value);
                });

                // Merge with locally stored profiles
                const localProfilesRaw = localStorage.getItem('citizenx-user-profiles') || '[]';
                console.log('Raw localStorage profiles:', localProfilesRaw);
                const localProfiles = JSON.parse(localProfilesRaw);
                console.log('Parsed localStorage profiles:', localProfiles);
                localProfiles.forEach((profile: UserProfile) => {
                    if (!profilesMap.has(profile._id)) {
                        profilesMap.set(profile._id, profile);
                    }
                });
                setProfiles(profilesMap);
                console.log('Initial profiles loaded:', Array.from(profilesMap.entries()));
                setLoading(false);

                // Listen for updates from OrbitDB
                userProfilesDb.events.on('update', async () => {
                    const updatedDocs = await userProfilesDb.all();
                    const updatedProfilesMap = new Map<string, UserProfile>();
                    updatedDocs.forEach((doc: any) => {
                        updatedProfilesMap.set(doc.value._id, doc.value);
                    });

                    // Merge with locally stored profiles that haven't been synced
                    const localProfiles = JSON.parse(localStorage.getItem('citizenx-user-profiles') || '[]');
                    localProfiles.forEach((profile: UserProfile) => {
                        if (!updatedProfilesMap.has(profile._id)) {
                            updatedProfilesMap.set(profile._id, profile);
                        }
                    });
                    setProfiles(updatedProfilesMap);
                    console.log('User profiles updated:', Array.from(updatedProfilesMap.entries()));
                });

                // Sync local profiles to OrbitDB when peers connect
                userProfilesDb.events.on('peer', async () => {
                    console.log('Peer connected, syncing local profiles to OrbitDB');
                    const localProfiles = JSON.parse(localStorage.getItem('citizenx-user-profiles') || '[]');
                    for (const localProfile of localProfiles) {
                        try {
                            await userProfilesDb.put(localProfile);
                            console.log('Synced local profile to OrbitDB:', localProfile);
                        } catch (syncError) {
                            console.error('Failed to sync local profile:', syncError);
                        }
                    }
                    // Clear local storage after syncing
                    localStorage.setItem('citizenx-user-profiles', JSON.stringify([]));
                    const updatedDocs = await userProfilesDb.all();
                    const updatedProfilesMap = new Map<string, UserProfile>();
                    updatedDocs.forEach((doc: any) => {
                        updatedProfilesMap.set(doc.value._id, doc.value);
                    });
                    setProfiles(updatedProfilesMap);
                    console.log('Profiles after sync:', Array.from(updatedProfilesMap.entries()));
                });
            } catch (err) {
                console.error('Failed to initialize user profiles database:', err);
                setError('Failed to initialize user profiles database');
                setLoading(false);
            }
        }
        initUserProfilesDB();
    }, []);

    const createProfile = async (handle: string, profilePicture: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        const profile: UserProfile = {
            _id: did,
            handle,
            profilePicture,
        };
        try {
            if (!db) {
                throw new Error('Database not initialized');
            }
            await db.put(profile);
            console.log('User profile created:', profile);

            // Update profiles state
            setProfiles((prev) => {
                const newProfiles = new Map(prev);
                newProfiles.set(did, profile);
                console.log('Profiles after create:', Array.from(newProfiles.entries()));
                return newProfiles;
            });
        } catch (err: any) {
            if (err.message.includes('NoPeersSubscribedToTopic')) {
                console.warn('No peers subscribed, saving profile to localStorage:', profile);
                const localProfiles = JSON.parse(localStorage.getItem('citizenx-user-profiles') || '[]');
                const existingIndex = localProfiles.findIndex((p: UserProfile) => p._id === did);
                if (existingIndex !== -1) {
                    localProfiles[existingIndex] = profile;
                } else {
                    localProfiles.push(profile);
                }
                localStorage.setItem('citizenx-user-profiles', JSON.stringify(localProfiles));

                // Update profiles state to reflect local storage
                setProfiles((prev) => {
                    const newProfiles = new Map(prev);
                    newProfiles.set(did, profile);
                    console.log('Profiles after local save:', Array.from(newProfiles.entries()));

                    // Force a refresh by re-fetching local profiles
                    const updatedLocalProfiles = JSON.parse(localStorage.getItem('citizenx-user-profiles') || '[]');
                    updatedLocalProfiles.forEach((p: UserProfile) => {
                        if (!newProfiles.has(p._id)) {
                            newProfiles.set(p._id, p);
                        }
                    });
                    console.log('Profiles after refresh:', Array.from(newProfiles.entries()));
                    return newProfiles;
                });
            } else {
                console.error('Failed to create user profile:', err);
                throw err;
            }
        }
    };

    const updateProfile = async (handle: string, profilePicture: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        try {
            if (!db) {
                throw new Error('Database not initialized');
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

            // Update profiles state
            setProfiles((prev) => {
                const newProfiles = new Map(prev);
                newProfiles.set(did, updatedProfile);
                console.log('Profiles after update:', Array.from(newProfiles.entries()));
                return newProfiles;
            });
        } catch (err: any) {
            if (err.message.includes('NoPeersSubscribedToTopic')) {
                console.warn('No peers subscribed, updating profile in localStorage:', { did, handle, profilePicture });
                const localProfiles = JSON.parse(localStorage.getItem('citizenx-user-profiles') || '[]');
                const existingIndex = localProfiles.findIndex((p: UserProfile) => p._id === did);
                const updatedProfile: UserProfile = {
                    _id: did,
                    handle,
                    profilePicture,
                };
                if (existingIndex !== -1) {
                    localProfiles[existingIndex] = updatedProfile;
                } else {
                    localProfiles.push(updatedProfile);
                }
                localStorage.setItem('citizenx-user-profiles', JSON.stringify(localProfiles));

                // Update profiles state to reflect local storage
                setProfiles((prev) => {
                    const newProfiles = new Map(prev);
                    newProfiles.set(did, updatedProfile);
                    console.log('Profiles after local update:', Array.from(newProfiles.entries()));
                    return newProfiles;
                });
            } else {
                console.error('Failed to update user profile:', err);
                throw err;
            }
        }
    };

    return { profiles, createProfile, updateProfile, loading, error };
};