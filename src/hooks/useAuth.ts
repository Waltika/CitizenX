// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { generateKeyPair, signMessage, verifySignature, encryptPrivateKey, decryptPrivateKey } from '../utils/crypto';

interface UseAuthResult {
    did: string | null;
    authenticate: () => Promise<void>;
    signOut: () => void;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (identityData: string, passphrase: string) => Promise<void>;
    error: string | null;
}

const useAuth = (): UseAuthResult => {
    const [did, setDid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const authenticate = async () => {
        try {
            const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
                chrome.storage.local.get(['did', 'privateKey'], resolve);
            });

            if (result.did && result.privateKey) {
                setDid(result.did);
                const challenge = Date.now().toString();
                const signature = await signMessage(challenge, result.privateKey);
                const isValid = await verifySignature(challenge, signature, result.did);
                if (!isValid) {
                    throw new Error('Failed to verify existing key pair');
                }
                setError(null);
            } else {
                const keyPair = await generateKeyPair();
                chrome.storage.local.set({ did: keyPair.publicKey, privateKey: keyPair.privateKey }, () => {
                    console.log('Key pair stored in chrome.storage.local');
                    setDid(keyPair.publicKey);
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
        setError(null);
        chrome.storage.local.remove(['did', 'privateKey'], () => {
            console.log('Cleared DID and private key from chrome.storage.local');
        });
    };

    const exportIdentity = async (passphrase: string): Promise<string> => {
        const result = await new Promise<{ did?: string; privateKey?: string }>((resolve) => {
            chrome.storage.local.get(['did', 'privateKey'], resolve);
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
            const { did, privateKey: encryptedPrivateKey } = JSON.parse(identityData);
            const privateKey = await decryptPrivateKey(encryptedPrivateKey, passphrase);
            const challenge = Date.now().toString();
            const signature = await signMessage(challenge, privateKey);
            const isValid = await verifySignature(challenge, signature, did);
            if (!isValid) {
                throw new Error('Invalid key pair or passphrase');
            }
            chrome.storage.local.set({ did, privateKey }, () => {
                console.log('Imported identity stored in chrome.storage.local');
                setDid(did);
                setError(null);
            });
        } catch (err) {
            console.error('Import error:', err);
            setError((err as Error).message);
            setDid(null);
            throw err;
        }
    };

    useEffect(() => {
        chrome.storage.local.get(['did'], (result) => {
            if (result.did) {
                setDid(result.did);
            }
        });
    }, []);

    return { did, authenticate, signOut, exportIdentity, importIdentity, error };
};

export default useAuth;