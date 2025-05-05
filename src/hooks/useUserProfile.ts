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
    authenticate: () => Promise<void>;
    signOut: () => void;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture?: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture?: string) => Promise<void>;
}

export const useUserProfile = (): UseUserProfileReturn => {
    const { storage, error: storageError, isLoading: storageLoading } = useStorage();
    const [did, setDid] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
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

                        // Load the private key from chrome.storage.local
                        const storedPrivateKey = await new Promise<string | null>((resolve) => {
                            chrome.storage.local.get(['privateKey'], (result) => {
                                resolve(result.privateKey || null);
                            });
                        });

                        if (storedPrivateKey) {
                            setPrivateKey(storedPrivateKey);
                            console.log('useUserProfile: Loaded private key from storage');
                        } else {
                            console.warn('useUserProfile: Private key not found in storage');
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
                            chrome.storage.local.remove('privateKey', () => resolve());
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
                const { did: newDid, privateKey: newPrivateKey } = await generateDID();
                if (validateDID(newDid)) {
                    setDid(newDid);
                    setPrivateKey(newPrivateKey);
                    await storage.setCurrentDID(newDid);
                    await new Promise<void>((resolve) => {
                        chrome.storage.local.set({ privateKey: newPrivateKey }, () => resolve());
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
                chrome.storage.local.remove('privateKey', () => resolve());
            });
            setDid(null);
            setPrivateKey(null);
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

        if (!did || !privateKey) {
            throw new Error('Not authenticated');
        }

        try {
            // Include the DID, private key, and profile in the export
            const exportData = {
                did,
                privateKey,
                profile: profile || { did, handle: 'Unknown' },
            };
            const dataString = JSON.stringify(exportData);
            const exportedData = await exportKeyPair(dataString, passphrase);
            console.log('useUserProfile: Exported identity:', exportedData);
            return exportedData;
        } catch (err) {
            console.error('useUserProfile: Export identity failed:', err);
            throw new Error('Failed to export identity: ' + (err.message || 'Unknown error'));
        }
    }, [storageLoading, storage, did, privateKey, profile]);

    const importIdentity = useCallback(async (data: string, passphrase: string) => {
        if (storageLoading) {
            throw new Error('Storage is still initializing');
        }

        if (!storage) {
            throw new Error('Storage not initialized');
        }

        try {
            const decryptedData = await importKeyPair(data, passphrase);
            const { did: importedDid, privateKey: importedPrivateKey, profile: importedProfile } = JSON.parse(decryptedData);
            if (!validateDID(importedDid)) {
                throw new Error('Invalid DID format');
            }

            setDid(importedDid);
            setPrivateKey(importedPrivateKey);
            await storage.setCurrentDID(importedDid);
            await new Promise<void>((resolve) => {
                chrome.storage.local.set({ privateKey: importedPrivateKey }, () => resolve());
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
        } catch (err) {
            console.error('useUserProfile: Import identity failed:', err);
            let errorMessage = 'Failed to import identity';
            if (err.message.includes('OperationError') || err.message.includes('Failed to decrypt')) {
                errorMessage = 'Failed to import identity: Incorrect passphrase or corrupted data';
            } else if (err.message.includes('Invalid DID format')) {
                errorMessage = 'Failed to import identity: Invalid DID format';
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
        authenticate,
        signOut,
        exportIdentity,
        importIdentity,
        createProfile,
        updateProfile,
    };
};