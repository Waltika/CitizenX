import { useState, useEffect, useCallback } from 'react';
import { useStorage } from './useStorage';
import { generateDID, validateDID } from '../utils/did';
import { exportKeyPair, importKeyPair } from '../utils/crypto';
import { Profile } from '../types';

interface UseUserProfileReturn {
    did: string | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    privateKey: string | null;
    publicKey: string | null;
    authenticate: () => Promise<void>;
    signOut: () => Promise<void>;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture?: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture?: string) => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [did, setDid] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeProfile = async () => {
            if (storageLoading) {
                return;
            }

            if (!storage) {
                setError('Storage not initialized');
                setLoading(false);
                return;
            }

            try {
                const storedDid = await storage.getCurrentDID();
                if (storedDid) {
                    if (validateDID(storedDid)) {
                        setDid(storedDid);
                        console.log('useUserProfile: Loaded DID from storage:', storedDid);

                        // Load the key pair from chrome.storage.local
                        const storedKeyPair = await new Promise<{ publicKey?: string; privateKey?: string } | null>((resolve) => {
                            chrome.storage.local.get(['publicKey', 'privateKey'], (result) => {
                                resolve(result);
                            });
                        });

                        if (
                            storedKeyPair?.privateKey &&
                            storedKeyPair?.publicKey &&
                            typeof storedKeyPair.privateKey === 'string' &&
                            typeof storedKeyPair.publicKey === 'string' &&
                            storedKeyPair.privateKey.length > 0 &&
                            storedKeyPair.publicKey.length > 0
                        ) {
                            setPrivateKey(storedKeyPair.privateKey);
                            setPublicKey(storedKeyPair.publicKey);
                            console.log('useUserProfile: Loaded key pair from storage:', {
                                publicKey: storedKeyPair.publicKey.slice(0, 4) + '...',
                                privateKey: storedKeyPair.privateKey.slice(0, 4) + '...'
                            });
                        } else {
                            console.warn('useUserProfile: Incomplete or invalid key pair in storage, clearing DID');
                            await storage.clearCurrentDID();
                            await new Promise<void>((resolve) => {
                                chrome.storage.local.remove(['publicKey', 'privateKey'], () => resolve());
                            });
                        }

                        const userProfile = await storage.getProfile(storedDid);
                        if (userProfile) {
                            setProfile(userProfile);
                            console.log('useUserProfile: Loaded profile from storage:', userProfile);
                        } else {
                            console.warn('useUserProfile: Profile not found for DID:', storedDid);
                        }
                    } else {
                        console.warn('useUserProfile: Invalid DID in storage, clearing...');
                        await storage.clearCurrentDID();
                        await new Promise<void>((resolve) => {
                            chrome.storage.local.remove(['publicKey', 'privateKey'], () => resolve());
                        });
                    }
                }
            } catch (err) {
                console.error('useUserProfile: Failed to initialize:', err);
                setError('Failed to initialize user profile');
            } finally {
                setLoading(false);
            }
        };

        initializeProfile();
    }, [storage, storageLoading]);

    const authenticate = useCallback(async () => {
        if (storageLoading) {
            setError('Storage is still initializing');
            return;
        }

        if (!storage) {
            setError('Storage not initialized');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            if (!did) {
                const { did: newDid, keyPair: newKeyPair } = await generateDID();
                if (validateDID(newDid)) {
                    if (!newKeyPair.pub || !newKeyPair.priv || typeof newKeyPair.pub !== 'string' || typeof newKeyPair.priv !== 'string' || newKeyPair.pub.length === 0 || newKeyPair.priv.length === 0) {
                        throw new Error('Generated key pair is invalid or incomplete');
                    }
                    setDid(newDid);
                    setPrivateKey(newKeyPair.priv);
                    setPublicKey(newKeyPair.pub);
                    await storage.setCurrentDID(newDid);
                    await new Promise<void>((resolve) => {
                        chrome.storage.local.set({ publicKey: newKeyPair.pub, privateKey: newKeyPair.priv }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('useUserProfile: Failed to store key pair:', chrome.runtime.lastError);
                                setError('Failed to store key pair');
                                resolve();
                            } else {
                                console.log('useUserProfile: Stored key pair in storage');
                                resolve();
                            }
                        });
                    });
                    console.log('useUserProfile: Created and saved new DID:', newDid);
                } else {
                    throw new Error('Generated DID is invalid');
                }
            }
        } catch (err) {
            console.error('useUserProfile: Authentication failed:', err);
            setError('Authentication failed');
        } finally {
            setLoading(false);
        }
    }, [storage, storageLoading, did]);

    const signOut = useCallback(async () => {
        if (storageLoading) {
            setError('Storage is still initializing');
            return;
        }

        if (!storage) {
            setError('Storage not initialized');
            return;
        }

        try {
            await storage.clearCurrentDID();
            await new Promise<void>((resolve) => {
                chrome.storage.local.remove(['publicKey', 'privateKey'], () => {
                    if (chrome.runtime.lastError) {
                        console.error('useUserProfile: Failed to clear key pair:', chrome.runtime.lastError);
                        setError('Failed to clear key pair');
                        resolve();
                    } else {
                        console.log('useUserProfile: Cleared key pair from storage');
                        resolve();
                    }
                });
            });
            setDid(null);
            setPrivateKey(null);
            setPublicKey(null);
            setProfile(null);
            setError(null);
            console.log('useUserProfile: Signed out');
        } catch (err) {
            console.error('useUserProfile: Sign out failed:', err);
            setError('Sign out failed');
        }
    }, [storage, storageLoading]);

    const exportIdentity = useCallback(async (passphrase: string) => {
        if (storageLoading) {
            throw new Error('Storage is still initializing');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        if (!did || !privateKey || !publicKey || typeof privateKey !== 'string' || typeof publicKey !== 'string' || privateKey.length === 0 || publicKey.length === 0) {
            throw new Error('Not authenticated or invalid key pair');
        }

        try {
            // Include the DID, key pair, and profile in the export
            const exportData = {
                did,
                keyPair: { pub: publicKey, priv: privateKey },
                profile: profile || { did, handle: 'Unknown' },
            };
            const dataString = JSON.stringify(exportData);
            const exportedData = await exportKeyPair(dataString, passphrase);
            console.log('useUserProfile: Exported identity:', exportedData);
            return exportedData;
        } catch (err: any) {
            console.error('useUserProfile: Export identity failed:', err);
            throw new Error('Failed to export identity: ' + (err.message || 'Unknown error'));
        }
    }, [storageLoading, storage, did, privateKey, publicKey, profile]);

    const importIdentity = useCallback(async (data: string, passphrase: string) => {
        if (storageLoading) {
            throw new Error('Storage is still initializing');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        try {
            const decryptedData = await importKeyPair(data, passphrase);
            const { did: importedDid, keyPair: importedKeyPair, profile: importedProfile } = JSON.parse(decryptedData);
            if (!validateDID(importedDid)) {
                throw new Error('Invalid DID format');
            }
            if (
                !importedKeyPair?.pub ||
                !importedKeyPair?.priv ||
                typeof importedKeyPair.pub !== 'string' ||
                typeof importedKeyPair.priv !== 'string' ||
                importedKeyPair.pub.length === 0 ||
                importedKeyPair.priv.length === 0
            ) {
                throw new Error('Invalid key pair format');
            }

            setDid(importedDid);
            setPrivateKey(importedKeyPair.priv);
            setPublicKey(importedKeyPair.pub);
            await storage.setCurrentDID(importedDid);
            await new Promise<void>((resolve) => {
                chrome.storage.local.set({ publicKey: importedKeyPair.pub, privateKey: importedKeyPair.priv }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('useUserProfile: Failed to store imported key pair:', chrome.runtime.lastError);
                        throw new Error('Failed to store imported key pair');
                    }
                    console.log('useUserProfile: Stored imported key pair');
                    resolve();
                });
            });
            console.log('useUserProfile: Imported identity:', importedDid);

            if (importedProfile && importedProfile.did) {
                await storage.saveProfile(importedProfile);
                setProfile(importedProfile);
                console.log('useUserProfile: Restored profile after import:', importedProfile);
            } else {
                const userProfile = await storage.getProfile(importedDid);
                if (userProfile) {
                    setProfile(userProfile);
                    console.log('useUserProfile: Loaded profile after import:', userProfile);
                }
            }
        } catch (err: any) {
            console.error('useUserProfile: Import identity failed:', err);
            let errorMessage = 'Failed to import identity';
            if (err.message.includes('OperationError') || err.message.includes('Failed to decrypt')) {
                errorMessage = 'Failed to import identity: Incorrect passphrase or corrupted data';
            } else if (err.message.includes('Invalid DID format') || err.message.includes('Invalid key pair format')) {
                errorMessage = 'Failed to import identity: ' + err.message;
            } else {
                errorMessage = 'Failed to import identity: ' + (err.message || 'Unknown error');
            }
            throw new Error(errorMessage);
        }
    }, [storageLoading, storage]);

    const createProfile = useCallback(
        async (handle: string, profilePicture?: string) => {
            if (storageLoading) {
                setError('Storage is still initializing');
                return;
            }

            if (!storage || !did) {
                setError('Not authenticated or storage not initialized');
                return;
            }

            try {
                const newProfile: Profile = {
                    did,
                    handle,
                    profilePicture,
                };

                console.log('useUserProfile: Saving profile to storage:', newProfile);
                await storage.saveProfile(newProfile);
                setProfile(newProfile);
                setError(null);
            } catch (err) {
                console.error('useUserProfile: Failed to create profile:', err);
                setError('Failed to create profile');
            }
        },
        [storageLoading, storage, did]
    );

    const updateProfile = useCallback(
        async (handle: string, profilePicture?: string) => {
            if (storageLoading) {
                setError('Storage is still initializing');
                return;
            }

            if (!storage || !did) {
                setError('Not authenticated or storage not initialized');
                return;
            }

            try {
                const updatedProfile: Profile = {
                    did,
                    handle,
                    profilePicture,
                };

                console.log('useUserProfile: Updating profile in storage:', updatedProfile);
                await storage.saveProfile(updatedProfile);
                setProfile(updatedProfile);
                setError(null);
            } catch (err) {
                console.error('useUserProfile: Failed to update profile:', err);
                setError('Failed to update profile');
            }
        },
        [storageLoading, storage, did]
    );

    return {
        did,
        profile,
        loading: loading || storageLoading,
        error: error || storageError,
        privateKey,
        publicKey,
        authenticate,
        signOut,
        exportIdentity,
        importIdentity,
        createProfile,
        updateProfile,
    };
};