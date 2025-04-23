// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { generateKeyPair, signMessage, verifySignature, encryptPrivateKey, decryptPrivateKey } from '../utils/crypto';
import { useUserProfiles } from './useUserProfiles';
import { UserProfile } from '../shared/types/userProfile';

interface UseAuthResult {
    did: string | null;
    profile: UserProfile | null;
    loading: boolean;
    authenticate: () => Promise<void>;
    signOut: () => void;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (identityData: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture: string) => Promise<void>;
    error: string | null;
}

const useAuth = (): UseAuthResult => {
    const [did, setDid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { profiles, loading, createProfile, updateProfile, error: profilesError } = useUserProfiles(did);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const chromeStorage = chrome as typeof chrome;
        if (!chromeStorage.storage || !chromeStorage.storage.local) {
            setError('chrome.storage.local is not available');
            return;
        }
        chromeStorage.storage.local.get(['did'], (result) => {
            if (result.did) {
                setDid(result.did);
                console.log('useAuth: Initial DID from storage:', result.did);
                // Check for DID mismatch in localStorage profiles
                const localProfilesRaw = localStorage.getItem('citizenx-user-profiles') || '[]';
                console.log('useAuth: Checking localStorage profiles for DID mismatch:', localProfilesRaw);
                const localProfiles = JSON.parse(localProfilesRaw);
                const matchingProfile = localProfiles.find((p: UserProfile) => p._id === result.did);
                if (!matchingProfile && localProfiles.length > 0) {
                    console.log('useAuth: DID mismatch detected, clearing stale profiles');
                    localStorage.setItem('citizenx-user-profiles', JSON.stringify([]));
                }
            } else {
                console.log('useAuth: No DID found in storage');
            }
        });
    }, []);

    useEffect(() => {
        console.log('useAuth: Loading profiles, loading:', loading, 'profiles:', Array.from(profiles.entries()));
        if (did && !loading) {
            const userProfile = profiles.get(did);
            console.log('useAuth: Profile for DID', did, ':', userProfile);
            setProfile(userProfile || null);
        }
    }, [did, profiles, loading]);

    const authenticate = async () => {
        try {
            const chromeStorage = chrome as typeof chrome;
            if (!chromeStorage.storage || !chromeStorage.storage.local) {
                throw new Error('chrome.storage.local is not available');
            }
            const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
                chromeStorage.storage.local.get(['did', 'privateKey'], resolve);
            });

            if (result.did && result.privateKey) {
                setDid(result.did);
                console.log('useAuth: Authenticated DID:', result.did);
                const challenge = Date.now().toString();
                const signature = await signMessage(challenge, result.privateKey);
                const isValid = await verifySignature(challenge, signature, result.did);
                if (!isValid) {
                    throw new Error('Failed to verify existing key pair');
                }
                setError(null);
            } else {
                const keyPair = await generateKeyPair();
                chromeStorage.storage.local.set({ did: keyPair.publicKey, privateKey: keyPair.privateKey }, () => {
                    console.log('useAuth: Key pair stored in chrome.storage.local');
                    setDid(keyPair.publicKey);
                    console.log('useAuth: New authenticated DID:', keyPair.publicKey);
                    setError(null);
                });
            }
        } catch (err) {
            console.error('useAuth: Authentication error:', err);
            setError((err as Error).message);
            setDid(null);
        }
    };

    const signOut = () => {
        setDid(null);
        setProfile(null);
        setError(null);
        const chromeStorage = chrome as typeof chrome;
        if (chromeStorage.storage && chromeStorage.storage.local) {
            chromeStorage.storage.local.remove(['did', 'privateKey'], () => {
                console.log('useAuth: Cleared DID and private key from chrome.storage.local');
            });
            // Clear profiles from localStorage to prevent stale data
            localStorage.setItem('citizenx-user-profiles', JSON.stringify([]));
            console.log('useAuth: Cleared profiles from localStorage');
        }
    };

    const exportIdentity = async (passphrase: string): Promise<string> => {
        const chromeStorage = chrome as typeof chrome;
        if (!chromeStorage.storage || !chromeStorage.storage.local) {
            throw new Error('chrome.storage.local is not available');
        }
        const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
            chromeStorage.storage.local.get(['did', 'privateKey'], resolve);
        });

        if (!result.did || !result.privateKey) {
            throw new Error('No identity found to export');
        }

        const encryptedPrivateKey = await encryptPrivateKey(result.privateKey, passphrase);
        const identityData = JSON.stringify({
            did: result.did,
            privateKey: encryptedPrivateKey
        });

        return identityData;
    };

    const importIdentity = async (identityData: string, passphrase: string) => {
        try {
            const chromeStorage = chrome as typeof chrome;
            if (!chromeStorage.storage || !chromeStorage.storage.local) {
                throw new Error('chrome.storage.local is not available');
            }
            const { did, privateKey: encryptedPrivateKey } = JSON.parse(identityData);
            const privateKey = await decryptPrivateKey(encryptedPrivateKey, passphrase);
            const challenge = Date.now().toString();
            const signature = await signMessage(challenge, privateKey);
            const isValid = await verifySignature(challenge, signature, did);
            if (!isValid) {
                throw new Error('Invalid key pair or passphrase');
            }
            chromeStorage.storage.local.set({ did, privateKey }, () => {
                console.log('useAuth: Imported identity stored in chrome.storage.local');
                setDid(did);
                console.log('useAuth: Imported DID:', did);
                setError(null);
            });
        } catch (err) {
            console.error('useAuth: Import error:', err);
            setError((err as Error).message);
            setDid(null);
            throw err;
        }
    };

    return { did, profile, loading, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile, error: error || profilesError };
};

export default useAuth;