// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { generateKeyPair, exportKeyPair, importKeyPair } from '../utils/crypto';
import { useOrbitDB } from './useOrbitDB';

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
    signOut: () => Promise<void>;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (identityData: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture: string) => Promise<void>;
    error: string | null;
}

export function useAuth(): UseAuthResult {
    const [did, setDid] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { db, isReady, error: dbError } = useOrbitDB();

    useEffect(() => {
        const loadDidAndProfiles = async () => {
            try {
                // Load DID and private key from chrome.storage.local
                const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
                    chrome.storage.local.get(['did', 'privateKey'], (res) => resolve(res));
                });
                console.log('useAuth: Loading DID from chrome.storage.local:', result);
                if (result.did && result.privateKey) {
                    console.log('useAuth: DID loaded:', result.did);
                    setDid(result.did);

                    // Load profiles from localStorage as a fallback
                    const localProfiles = localStorage.getItem('citizenx-profiles');
                    const parsedProfiles: Profile[] = localProfiles ? JSON.parse(localProfiles) : [];
                    console.log('useAuth: Profiles from localStorage:', parsedProfiles);
                    const userProfile = parsedProfiles.find((p: Profile) => p._id === result.did);
                    if (userProfile) {
                        console.log('useAuth: Found user profile in localStorage:', userProfile);
                        setProfile(userProfile);
                    } else {
                        console.log('useAuth: No user profile found in localStorage for DID:', result.did);
                    }
                    setProfiles(parsedProfiles);
                } else {
                    console.log('useAuth: No DID found in chrome.storage.local');
                }

                // Wait for database to be ready before proceeding
                if (!isReady) {
                    console.log('useAuth: Database not ready yet, waiting...');
                    return;
                }

                // Fetch profiles from OrbitDB if the database is ready
                if (db) {
                    try {
                        console.log('useAuth: Fetching profiles from OrbitDB');
                        const orbitdbProfiles: Profile[] = [];
                        for await (const doc of db.iterator()) {
                            orbitdbProfiles.push(doc);
                        }
                        console.log('useAuth: Profiles from OrbitDB:', orbitdbProfiles);
                        const updatedProfiles = [...profiles, ...orbitdbProfiles];
                        const uniqueProfiles = Array.from(new Map(updatedProfiles.map((p: Profile) => [p._id, p])).values());
                        setProfiles(uniqueProfiles);
                        localStorage.setItem('citizenx-profiles', JSON.stringify(uniqueProfiles));
                        console.log('useAuth: Updated profiles in localStorage:', uniqueProfiles);

                        if (did) {
                            const userProfile = uniqueProfiles.find((p: Profile) => p._id === did);
                            if (userProfile) {
                                console.log('useAuth: Found user profile in OrbitDB:', userProfile);
                                setProfile(userProfile);
                            } else {
                                console.log('useAuth: No user profile found in OrbitDB for DID:', did);
                            }
                        }

                        // Sync pending operations from background.js
                        chrome.runtime.sendMessage({ action: 'syncPending' }, async (response: { pending?: { profiles: any[] } }) => {
                            if (response.pending) {
                                console.log('useAuth: Syncing pending operations:', response.pending);
                                const { profiles: pendingProfiles } = response.pending;
                                for (const operation of pendingProfiles) {
                                    if (operation.action === 'putProfile') {
                                        try {
                                            await db.put(operation.data);
                                            console.log('useAuth: Applied pending profile:', operation.data);
                                        } catch (err) {
                                            console.error('useAuth: Failed to apply pending profile:', err);
                                        }
                                    }
                                }
                                // Refresh profiles after syncing
                                const syncedProfiles: Profile[] = [];
                                for await (const doc of db.iterator()) {
                                    syncedProfiles.push(doc);
                                }
                                console.log('useAuth: Profiles after syncing:', syncedProfiles);
                                const finalProfiles = [...profiles, ...syncedProfiles];
                                const finalUniqueProfiles = Array.from(new Map(finalProfiles.map((p: Profile) => [p._id, p])).values());
                                setProfiles(finalUniqueProfiles);
                                localStorage.setItem('citizenx-profiles', JSON.stringify(finalUniqueProfiles));
                                console.log('useAuth: Final profiles in localStorage after sync:', finalUniqueProfiles);
                                if (did) {
                                    const userProfile = finalUniqueProfiles.find((p: Profile) => p._id === did);
                                    if (userProfile) {
                                        console.log('useAuth: Found user profile after sync:', userProfile);
                                        setProfile(userProfile);
                                    }
                                }
                            } else {
                                console.log('useAuth: No pending operations to sync');
                            }
                        });
                    } catch (err) {
                        console.error('useAuth: Failed to fetch profiles from OrbitDB:', err);
                        setError('Failed to load profiles from database');
                    }
                }
            } catch (err) {
                console.error('useAuth: Failed to load DID or profiles:', err);
                setError('Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        loadDidAndProfiles();
    }, [did, db, isReady]);

    useEffect(() => {
        if (dbError) {
            setError('Failed to load profiles');
        }
    }, [dbError]);

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

    const authenticate = async () => {
        try {
            setLoading(true);
            const { did: newDid, privateKey } = await generateKeyPair();
            console.log('useAuth: Generated new DID:', newDid);
            await new Promise<void>((resolve, reject) => {
                chrome.storage.local.set({ did: newDid, privateKey }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('useAuth: Failed to save DID to chrome.storage.local:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('useAuth: Saved DID to chrome.storage.local');
                        resolve();
                    }
                });
            });
            setDid(newDid);
            setLoading(false);
        } catch (err) {
            console.error('Authentication failed:', err);
            setError('Authentication failed');
            setLoading(false);
        }
    };

    const signOut = async () => {
        console.log('useAuth: Signing out, DID:', did);
        const localProfiles = localStorage.getItem('citizenx-profiles');
        let updatedProfiles: Profile[] = localProfiles ? JSON.parse(localProfiles) : [];
        updatedProfiles = updatedProfiles.filter((p: Profile) => p._id !== did);
        localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
        console.log('useAuth: Updated profiles after sign out:', updatedProfiles);
        setProfiles(updatedProfiles);
        setProfile(null);
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.remove(['did', 'privateKey'], () => {
                if (chrome.runtime.lastError) {
                    console.error('useAuth: Failed to remove DID from chrome.storage.local:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('useAuth: Removed DID from chrome.storage.local');
                    resolve();
                }
            });
        });
        setDid(null);
    };

    const exportIdentity = async (passphrase: string): Promise<string> => {
        const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
            chrome.storage.local.get(['did', 'privateKey'], (res) => resolve(res));
        });
        console.log('useAuth: Exporting identity:', result);
        if (!result.did || !result.privateKey) {
            throw new Error('No identity found to export');
        }
        const identityData = await exportKeyPair(result.did, result.privateKey, passphrase);
        return identityData;
    };

    const importIdentity = async (identityData: string, passphrase: string) => {
        const { did: importedDid, privateKey } = await importKeyPair(identityData, passphrase);
        console.log('useAuth: Imported DID:', importedDid);
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ did: importedDid, privateKey }, () => {
                if (chrome.runtime.lastError) {
                    console.error('useAuth: Failed to save imported DID to chrome.storage.local:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('useAuth: Saved imported DID to chrome.storage.local');
                    resolve();
                }
            });
        });
        setDid(importedDid);

        const localProfiles = localStorage.getItem('citizenx-profiles');
        const parsedProfiles: Profile[] = localProfiles ? JSON.parse(localProfiles) : [];
        const userProfile = parsedProfiles.find((p: Profile) => p._id === importedDid);
        if (userProfile) {
            console.log('useAuth: Found user profile after import:', userProfile);
            setProfile(userProfile);
        }
    };

    const saveProfile = async (profile: Profile) => {
        if (!db || !isReady) {
            // Database is not initialized; cache the operation
            console.log('useAuth: Database not ready, caching profile operation');
            return new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'putProfile', profile }, (response: any) => {
                    if (response.success) {
                        const updatedProfiles = [...profiles, profile];
                        setProfiles(updatedProfiles);
                        localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
                        console.log('useAuth: Cached profile operation, updated profiles:', updatedProfiles);
                        setProfile(profile);
                        resolve();
                    } else {
                        console.error('useAuth: Failed to cache profile operation:', response.error);
                        reject(new Error(response.error));
                    }
                });
            });
        }

        // Database is open; save directly to OrbitDB
        console.log('useAuth: Saving profile to OrbitDB');
        try {
            await db.put(profile);
            const updatedProfiles = [...profiles, profile];
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('useAuth: Saved profile to OrbitDB, updated profiles:', updatedProfiles);
            setProfile(profile);
        } catch (err) {
            console.error('useAuth: Failed to save profile to OrbitDB:', err);
            // Fallback to caching if OrbitDB fails
            await chrome.runtime.sendMessage({ action: 'putProfile', profile });
            const updatedProfiles = [...profiles, profile];
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('useAuth: OrbitDB save failed, cached profile:', updatedProfiles);
            setProfile(profile);
        }
    };

    const createProfile = async (handle: string, profilePicture: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        const profile: Profile = {
            _id: did,
            handle,
            profilePicture,
        };
        console.log('useAuth: Creating profile:', profile);
        await saveProfile(profile);
    };

    const updateProfile = async (handle: string, profilePicture: string) => {
        if (!did) {
            throw new Error('User not authenticated');
        }
        const updatedProfile: Profile = {
            _id: did,
            handle,
            profilePicture,
        };
        console.log('useAuth: Updating profile:', updatedProfile);

        if (!db || !isReady) {
            // Database is not initialized; cache the operation
            console.log('useAuth: Database not ready, caching profile update');
            return new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'putProfile', profile: updatedProfile }, (response: any) => {
                    if (response.success) {
                        const updatedProfiles = profiles.map((p: Profile) => (p._id === did ? updatedProfile : p));
                        setProfiles(updatedProfiles);
                        localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
                        console.log('useAuth: Cached profile update, updated profiles:', updatedProfiles);
                        setProfile(updatedProfile);
                        resolve();
                    } else {
                        console.error('useAuth: Failed to cache profile update:', response.error);
                        reject(new Error(response.error));
                    }
                });
            });
        }

        // Database is open; save directly to OrbitDB
        console.log('useAuth: Saving updated profile to OrbitDB');
        try {
            await db.put(updatedProfile);
            const updatedProfiles = profiles.map((p: Profile) => (p._id === did ? updatedProfile : p));
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('useAuth: Saved updated profile to OrbitDB, updated profiles:', updatedProfiles);
            setProfile(updatedProfile);
        } catch (err) {
            console.error('useAuth: Failed to save updated profile to OrbitDB:', err);
            // Fallback to caching if OrbitDB fails
            await chrome.runtime.sendMessage({ action: 'putProfile', profile: updatedProfile });
            const updatedProfiles = profiles.map((p: Profile) => (p._id === did ? updatedProfile : p));
            setProfiles(updatedProfiles);
            localStorage.setItem('citizenx-profiles', JSON.stringify(updatedProfiles));
            console.log('useAuth: OrbitDB save failed, cached updated profile:', updatedProfiles);
            setProfile(updatedProfile);
        }
    };

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