// src/hooks/useAuth.ts
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
import { generateKeyPair, exportKeyPair, importKeyPair } from '../utils/crypto';

interface Profile {
    _id: string; // DID
    handle: string;
    profilePicture: string;
}

interface UseAuthResult {
    did: string | null;
    profile: Profile | null;
    loading: boolean;
    authenticate: () => Promise<void>;
    signOut: () => void;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (identityData: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture: string) => Promise<void>;
    error: string | null;
}

export default function useAuth(): UseAuthResult {
    const [did, setDid] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [db, setDb] = useState<any>(null);

    useEffect(() => {
        async function init() {
            try {
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

                const orbitdb = await createOrbitDB({ ipfs });
                const database = await orbitdb.open('citizenx-profiles', { type: 'documents' });
                console.log('User profiles database opened:', database);
                setDb(database);

                // Load profiles from localStorage as a fallback
                const localProfiles = localStorage.getItem('citizenx-profiles');
                console.log('useAuth: Raw localStorage profiles:', localProfiles);
                const parsedProfiles = localProfiles ? JSON.parse(localProfiles) : [];
                console.log('useAuth: Parsed localStorage profiles:', parsedProfiles);
                setProfiles(parsedProfiles);
                console.log('useAuth: Initial profiles loaded:', parsedProfiles);

                // Load DID and private key from chrome.storage.local
                chrome.storage.local.get(['did', 'privateKey'], async (result) => {
                    if (result.did && result.privateKey) {
                        console.log('useAuth: Initial DID from storage:', result.did);
                        setDid(result.did);

                        // Check if localStorage profiles match the DID
                        console.log('useAuth: Checking localStorage profiles for DID mismatch:', parsedProfiles);
                        const userProfile = parsedProfiles.find((p: Profile) => p._id === result.did);
                        if (userProfile) {
                            console.log('useAuth: Comparing DID', result.did, 'with profile _id', userProfile._id);
                            console.log('useAuth: Setting initial profile from localStorage:', userProfile);
                            setProfile(userProfile);
                        }
                    }
                    console.log('useAuth: Finished loading DID and profile');
                    setLoading(false);
                });

                // Load profiles from OrbitDB
                const orbitdbProfiles: Profile[] = [];
                try {
                    const allDocsIterator = await database.all();
                    for await (const doc of allDocsIterator) {
                        orbitdbProfiles.push(doc.value);
                    }
                } catch (err) {
                    console.error('useAuth: Failed to iterate over database.all():', err);
                    const allDocs = await database.get('');
                    orbitdbProfiles.push(...allDocs.map((doc: any) => doc.value));
                }
                const updatedProfiles = [...parsedProfiles, ...orbitdbProfiles];
                const uniqueProfiles = Array.from(new Map(updatedProfiles.map((p: Profile) => [p._id, p])).values());
                setProfiles(uniqueProfiles);
            } catch (err) {
                console.error('Failed to initialize auth:', err);
                setError('Failed to initialize authentication');
                setLoading(false);
            }
        }

        init();

        return () => {
            if (db) {
                db.close();
            }
        };
    }, []);

    // ... (rest of the code remains the same)

    return {
        did,
        profile,
        loading,
        authenticate,
        signOut,
        exportIdentity,
        importIdentity,
        createProfile,
        updateProfile,
        error,
    };
};