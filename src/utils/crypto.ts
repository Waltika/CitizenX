// src/utils/crypto.ts
import { encode, decode } from 'base64-arraybuffer';

// Helper function to convert a string to an ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
}

// Helper function to convert an ArrayBuffer to a string
function arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

// Generate a key pair and derive a DID from the public key
export async function generateKeyPair(): Promise<{ did: string; privateKey: string }> {
    try {
        // Generate an ECDSA key pair using the P-256 curve
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDSA',
                namedCurve: 'P-256',
            },
            true, // Extractable
            ['sign', 'verify'] // Usages
        );

        // Export the public key to derive the DID
        const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
        const publicKeyBase64 = encode(publicKey);
        const did = `did:key:${publicKeyBase64}`; // Simplified DID format

        // Export the private key as JWK (JSON Web Key) for storage
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        const privateKeyString = JSON.stringify(privateKeyJwk);

        return { did, privateKey: privateKeyString };
    } catch (err) {
        console.error('Failed to generate key pair:', err);
        throw new Error('Failed to generate key pair');
    }
}

// Export the key pair with encryption using a passphrase
export async function exportKeyPair(did: string, privateKey: string, passphrase: string): Promise<string> {
    try {
        // Derive a key from the passphrase using PBKDF2
        const passphraseKey = await crypto.subtle.importKey(
            'raw',
            stringToArrayBuffer(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 100000,
                hash: 'SHA-256',
            },
            passphraseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // Encrypt the private key with the derived key
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedPrivateKey = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv,
            },
            derivedKey,
            stringToArrayBuffer(privateKey)
        );

        // Combine the salt, IV, and encrypted data into a single string
        const exportData = {
            salt: encode(salt),
            iv: encode(iv),
            encryptedPrivateKey: encode(encryptedPrivateKey),
            did,
        };

        return JSON.stringify(exportData);
    } catch (err) {
        console.error('Failed to export key pair:', err);
        throw new Error('Failed to export key pair');
    }
}

// Import the key pair by decrypting with a passphrase
export async function importKeyPair(identityData: string, passphrase: string): Promise<{ did: string; privateKey: string }> {
    try {
        const parsedData = JSON.parse(identityData);
        const { salt, iv, encryptedPrivateKey, did } = parsedData;

        // Derive the key from the passphrase using PBKDF2
        const passphraseKey = await crypto.subtle.importKey(
            'raw',
            stringToArrayBuffer(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: decode(salt),
                iterations: 100000,
                hash: 'SHA-256',
            },
            passphraseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Decrypt the private key
        const decryptedPrivateKey = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: decode(iv),
            },
            derivedKey,
            decode(encryptedPrivateKey)
        );

        const privateKeyString = arrayBufferToString(decryptedPrivateKey);

        return { did, privateKey: privateKeyString };
    } catch (err) {
        console.error('Failed to import key pair:', err);
        throw new Error('Failed to import key pair');
    }
}