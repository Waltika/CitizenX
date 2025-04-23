// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { generateKeyPair, signMessage, verifySignature, encryptPrivateKey, decryptPrivateKey } from '../utils/crypto';
import { useUserProfiles } from './useUserProfiles';
import { UserProfile } from '../shared/types/userProfile';

interface UseAuthResult {
    did: string | null;
    profile: UserProfile | null;
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
    const { profiles, createProfile, updateProfile, error: profilesError } = useUserProfiles(did);
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
                console.log('Initial DID from storage:', result.did);
            }
        });
    }, []);

    useEffect(() => {
        if (did && profiles.size > 0) {
            const userProfile = profiles.get(did);
            setProfile(userProfile || null);
        }
    }, [did, profiles]);

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
                console.log('Authenticated DID:', result.did);
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
                    console.log('Key pair stored in chrome.storage.local');
                    setDid(keyPair.publicKey);
                    console.log('New authenticated DID:', keyPair.publicKey);
                    setError(null);
                });
            }
        } catch (err) {
            console.error('Authentication error:', err);
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
                console.log('Cleared DID and private key from chrome.storage.local');
            });
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
                console.log('Imported identity stored in chrome.storage.local');
                setDid(did);
                console.log('Imported DID:', did);
                setError(null);
            });
        } catch (err) {
            console.error('Import error:', err);
            setError((err as Error).message);
            setDid(null);
            throw err;
        }
    };

    return { did, profile, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile, error: error || profilesError };
};

export default useAuth;