// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { generateKeyPair, signMessage, verifySignature } from '../utils/crypto';

interface UseAuthResult {
    did: string | null;
    authenticate: () => Promise<void>;
    signOut: () => void;
    error: string | null;
}

const useAuth = (): UseAuthResult => {
    const [did, setDid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const authenticate = async () => {
        try {
            // Check if we already have a key pair in storage
            chrome.storage.local.get(['did', 'privateKey'], async (result) => {
                let publicKey: string;
                let privateKey: string;

                if (result.did && result.privateKey) {
                    publicKey = result.did;
                    privateKey = result.privateKey;
                } else {
                    // Generate a new key pair
                    const keyPair = await generateKeyPair();
                    publicKey = keyPair.publicKey;
                    privateKey = keyPair.privateKey;

                    // Store the key pair in chrome.storage.local
                    chrome.storage.local.set({ did: publicKey, privateKey }, () => {
                        console.log('Key pair stored in chrome.storage.local');
                    });
                }

                // Use the public key as the DID
                setDid(publicKey);

                // Sign a challenge to verify the private key (optional)
                const challenge = Date.now().toString();
                const signature = await signMessage(challenge, privateKey);
                const isValid = await verifySignature(challenge, signature, publicKey);

                if (!isValid) {
                    throw new Error('Failed to verify key pair');
                }

                setError(null);
            });
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

    useEffect(() => {
        // Check for an existing DID on load
        chrome.storage.local.get(['did'], (result) => {
            if (result.did) {
                setDid(result.did);
            }
        });
    }, []);

    return { did, authenticate, signOut, error };
};

export default useAuth;