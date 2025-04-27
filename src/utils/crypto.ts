// src/utils/crypto.ts
import * as multibase from 'multibase';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { encode, decode } from 'base64-arraybuffer';
import { Buffer } from 'buffer';

// Configure @noble/ed25519 to use the SHA-512 implementation from @noble/hashes
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));
ed25519.etc.sha512Async = (...m) => Promise.resolve(sha512(ed25519.etc.concatBytes(...m)));

// Ed25519 multicodec prefix for did:key (0xED01 for Ed25519)
const ED25519_MULTICODEC_PREFIX = [0xED, 0x01];

// Helper function to convert a string to an ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(str);
    return uint8Array.buffer as ArrayBuffer; // Explicitly cast to ArrayBuffer
}

// Helper function to convert an ArrayBuffer to a string
function arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

// Generate a key pair and derive a DID from the public key (Ed25519)
export async function generateKeyPair(): Promise<{ did: string; privateKey: string }> {
    try {
        // Generate an Ed25519 key pair using @noble/ed25519
        const privateKeyBytes = ed25519.utils.randomPrivateKey();
        const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);

        // Prepend the Ed25519 multicodec prefix (0xED01) to the public key
        const prefixedPublicKey = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKeyBytes.length);
        prefixedPublicKey.set(ED25519_MULTICODEC_PREFIX, 0);
        prefixedPublicKey.set(publicKeyBytes, ED25519_MULTICODEC_PREFIX.length);

        // Encode the prefixed public key with multibase (base58btc, prefix 'z')
        const encodedPublicKey = multibase.encode('base58btc', prefixedPublicKey);
        const encodedPublicKeyStr = Buffer.from(encodedPublicKey).toString('utf8');

        // Create the DID (did:key:z<encoded-public-key>)
        const did = `did:key:${encodedPublicKeyStr}`;

        // Encode the private key as a hex string for storage
        const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');

        return { did, privateKey: privateKeyHex };
    } catch (err) {
        console.error('Failed to generate key pair:', err);
        throw new Error('Failed to generate key pair');
    }
}

// Export the key pair with encryption using a passphrase
export async function exportKeyPair(did: string, privateKey: string, passphrase: string): Promise<string> {
    try {
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

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedPrivateKey = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv,
            },
            derivedKey,
            stringToArrayBuffer(privateKey)
        );

        const exportData = {
            salt: encode(salt.buffer as ArrayBuffer), // Convert Uint8Array to ArrayBuffer
            iv: encode(iv.buffer as ArrayBuffer), // Convert Uint8Array to ArrayBuffer
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

        const decryptedPrivateKey = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: decode(iv),
            },
            derivedKey,
            decode(encryptedPrivateKey)
        );

        const privateKeyHex = arrayBufferToString(decryptedPrivateKey);

        return { did, privateKey: privateKeyHex };
    } catch (err) {
        console.error('Failed to import key pair:', err);
        throw new Error('Failed to import key pair');
    }
}

// Sign a message with the private key
export async function signMessage(privateKeyHex: string, message: string): Promise<string> {
    try {
        const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
        const messageBytes = new TextEncoder().encode(message);
        const signature = await ed25519.sign(messageBytes, privateKeyBytes);
        return Buffer.from(signature).toString('hex');
    } catch (err) {
        console.error('Failed to sign message:', err);
        throw new Error('Failed to sign message');
    }
}

// Verify a signature with the public key derived from the DID
export async function verifySignature(did: string, message: string, signatureHex: string): Promise<boolean> {
    try {
        // Extract the public key from the DID
        const identifier = did.split('did:key:')[1];
        const publicKeyBytes = multibase.decode(identifier);

        // Remove the multicodec prefix (2 bytes)
        const publicKey = publicKeyBytes.slice(2);

        const messageBytes = new TextEncoder().encode(message);
        const signature = Buffer.from(signatureHex, 'hex');
        return await ed25519.verify(signature, messageBytes, publicKey);
    } catch (err) {
        console.error('Failed to verify signature:', err);
        throw new Error('Failed to verify signature');
    }
}