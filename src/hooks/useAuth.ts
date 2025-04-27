import { useState, useEffect, useCallback } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { createDID } from '../utils/did'; // Assuming this utility exists for DID creation
import { StorageRepository } from '../storage/StorageRepository';
import { Profile } from '../types';

interface UseAuthProps {
    storage: StorageRepository | null; // StorageRepository from useStorage
}

interface UseAuthReturn {
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

export const useAuth = ({ storage }: UseAuthProps): UseAuthReturn => {
    const [did, setDid] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load DID and profile on mount using storage from useStorage
    useEffect(() => {
        const initializeAuth = async () => {
            if (!storage) {
                setError('Storage not initialized');
                setLoading(false);
                return;
            }

            try {
                // Check if a DID exists in storage
                const storedDid = await storage.getCurrentDID();
                if (storedDid) {
                    setDid(storedDid);
                    console.log('useAuth: Loaded DID from storage:', storedDid);

                    // Load the user's profile
                    const userProfile = await storage.getProfile(storedDid);
                    if (userProfile) {
                        setProfile(userProfile);
                        console.log('useAuth: Loaded profile from storage:', userProfile);
                    }
                }
            } catch (err) {
                console.error('useAuth: Failed to initialize:', err);
                setError('Failed to initialize authentication');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, [storage]);

    const authenticate = useCallback(async () => {
        if (!storage) {
            setError('Storage not initialized');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Create a new DID if none exists
            if (!did) {
                const newDid = await createDID();
                setDid(newDid);
                await storage.setCurrentDID(newDid);
                console.log('useAuth: Created and saved new DID:', newDid);
            }
        } catch (err) {
            console.error('useAuth: Authentication failed:', err);
            setError('Authentication failed');
        } finally {
            setLoading(false);
        }
    }, [storage, did]);

    const signOut = useCallback(async () => {
        if (!storage) {
            setError('Storage not initialized');
            return;
        }

        try {
            await storage.clearCurrentDID();
            setDid(null);
            setProfile(null);
            setError(null);
            console.log('useAuth: Signed out');
        } catch (err) {
            console.error('useAuth: Sign out failed:', err);
            setError('Sign out failed');
        }
    }, [storage]);

    const exportIdentity = useCallback(async (passphrase: string) => {
        if (!did) {
            throw new Error('Not authenticated');
        }

        try {
            // Export the DID (handled by createDID utility)
            const exportedData = await createDID.exportDID(did, passphrase);
            console.log('useAuth: Exported identity');
            return exportedData;
        } catch (err) {
            console.error('useAuth: Export identity failed:', err);
            throw new Error('Failed to export identity');
        }
    }, [did]);

    const importIdentity = useCallback(async (data: string, passphrase: string) => {
        if (!storage) {
            throw new Error('Storage not initialized');
        }

        try {
            const importedDid = await createDID.importDID(data, passphrase);
            setDid(importedDid);
            await storage.setCurrentDID(importedDid);
            console.log('useAuth: Imported identity:', importedDid);

            // Load the profile for the imported DID
            const userProfile = await storage.getProfile(importedDid);
            if (userProfile) {
                setProfile(userProfile);
                console.log('useAuth: Loaded profile after import:', userProfile);
            }
        } catch (err) {
            console.error('useAuth: Import identity failed:', err);
            throw new Error('Failed to import identity');
        }
    }, [storage]);

    const createProfile = useCallback(
        async (handle: string, profilePicture?: string) => {
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

                console.log('useAuth: Saving profile to storage:', newProfile);
                await storage.saveProfile(newProfile);
                setProfile(newProfile);
                setError(null);
            } catch (err) {
                console.error('useAuth: Failed to create profile:', err);
                setError('Failed to create profile');
            }
        },
        [storage, did]
    );

    const updateProfile = useCallback(
        async (handle: string, profilePicture?: string) => {
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

                console.log('useAuth: Updating profile in storage:', updatedProfile);
                await storage.saveProfile(updatedProfile);
                setProfile(updatedProfile);
                setError(null);
            } catch (err) {
                console.error('useAuth: Failed to update profile:', err);
                setError('Failed to update profile');
            }
        },
        [storage, did]
    );

    return {
        did,
        profile,
        loading,
        error,
        authenticate,
        signOut,
        exportIdentity,
        importIdentity,
        createProfile,
        updateProfile,
    };
};