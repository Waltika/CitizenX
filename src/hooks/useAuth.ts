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
import {bootstrapNodes} from "..//config/boostrap";

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
                                list: bootstrapNodes,
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

    useEffect(() => {
        if (!db) return;

        db.events.on('update', async () => {
            const orbitdbProfiles: Profile[] = [];
            try {
                const allDocsIterator = await db.all();
                for await (const doc of allDocsIterator) {
                    orbitdbProfiles.push(doc.value);
                }
            } catch (err) {
                console.error('useAuth: Failed to iterate over database.all() in update:', err);
                const allDocs = await db.get('');
                orbitdbProfiles.push(...allDocs.map((doc: any) => doc.value));
            }
            const updatedProfiles = [...profiles, ...orbitdbProfiles];
            const uniqueProfiles = Array.from(new Map(updatedProfiles.map((p: Profile) => [p._id, p])).values());
            setProfiles(uniqueProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(uniqueProfiles));
            console.log('Profiles after refresh:', uniqueProfiles);

            if (did) {
                const userProfile = uniqueProfiles.find((p: Profile) => p._id === did);
                console.log('useAuth: Profile for DID', did, ':', userProfile);
                setProfile(userProfile || null);
            }
        });
    }, [db, did]);

    const authenticate = async () => {
        try {
            setLoading(true);
            const { did: newDid, privateKey } = await generateKeyPair();
            await chrome.storage.local.set({ did: newDid, privateKey });
            console.log('useAuth: Key pair stored in chrome.storage.local');
            console.log('useAuth: New authenticated DID:', newDid);
            setDid(newDid);
            setLoading(false);
        } catch (err) {
            console.error('Authentication failed:', err);
            setError('Authentication failed');
            setLoading(false);
        }
    };

    const signOut = async () => {
        const localProfiles = localStorage.getItem('citizenx-profiles');
        let updatedProfiles = localProfiles ? JSON.parse(localProfiles) : [];
        updatedProfiles = updatedProfiles.filter((p: Profile) => p._id !== did);
        console.log('useAuth: Updated profiles after sign-out:', updatedProfiles);
        localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
        setProfiles(updatedProfiles);
        setProfile(null);
        console.log('useAuth: Cleared DID and private key from chrome.storage.local');
        await chrome.storage.local.remove(['did', 'privateKey']);
        setDid(null);
        console.log('useAuth: Loading profiles, loading:', loading, 'profiles:', updatedProfiles);
    };

    const exportIdentity = async (passphrase: string): Promise<string> => {
        const result = await chrome.storage.local.get(['did', 'privateKey']);
        if (!result.did || !result.privateKey) {
            throw new Error('No identity found to export');
        }
        const identityData = await exportKeyPair(result.did, result.privateKey, passphrase);
        return identityData;
    };

    const importIdentity = async (identityData: string, passphrase: string) => {
        const { did: importedDid, privateKey } = await importKeyPair(identityData, passphrase);
        await chrome.storage.local.set({ did: importedDid, privateKey });
        setDid(importedDid);

        const localProfiles = localStorage.getItem('citizenx-profiles');
        const parsedProfiles = localProfiles ? JSON.parse(localProfiles) : [];
        const userProfile = parsedProfiles.find((p: Profile) => p._id === importedDid);
        if (userProfile) {
            setProfile(userProfile);
        }
    };

    const createProfile = async (handle: string, profilePicture: string) => {
        if (!did || !db) {
            throw new Error('User not authenticated or database not initialized');
        }
        const profile: Profile = {
            _id: did,
            handle,
            profilePicture,
        };
        try {
            await db.put(profile);
            setProfile(profile);
            const updatedProfiles = [...profiles, profile];
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('Profiles after local save:', updatedProfiles);
        } catch (err) {
            console.log('No peers subscribed, saving profile to localStorage:', profile);
            const updatedProfiles = [...profiles, profile];
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('Profiles after local save:', updatedProfiles);
            setProfile(profile);
        }
    };

    const updateProfile = async (handle: string, profilePicture: string) => {
        if (!did || !db) {
            throw new Error('User not authenticated or database not initialized');
        }
        const updatedProfile: Profile = {
            _id: did,
            handle,
            profilePicture,
        };
        try {
            await db.put(updatedProfile);
            setProfile(updatedProfile);
            const updatedProfiles = profiles.map((p) => (p._id === did ? updatedProfile : p));
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
        } catch (err) {
            console.log('No peers subscribed, saving profile to localStorage:', updatedProfile);
            const updatedProfiles = profiles.map((p) => (p._id === did ? updatedProfile : p));
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            setProfile(updatedProfile);
        }
    };

    console.log('useAuth: Loading profiles, loading:', loading, 'profiles:', profiles);

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
}