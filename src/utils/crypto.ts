import * as multibase from 'multibase';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { encode, decode } from 'base64-arraybuffer';
import { Buffer } from 'buffer';

ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));
ed25519.etc.sha512Async = (...m) => Promise.resolve(sha512(ed25519.etc.concatBytes(...m)));

const ED25519_MULTICODEC_PREFIX = [0xED, 0x01];

function stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(str);
    return uint8Array.buffer as ArrayBuffer;
}

function arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
}

export async function generateKeyPair(): Promise<{ did: string; privateKey: string }> {
    try {
        const privateKeyBytes = ed25519.utils.randomPrivateKey();
        const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);

        const prefixedPublicKey = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKeyBytes.length);
        prefixedPublicKey.set(ED25519_MULTICODEC_PREFIX, 0);
        prefixedPublicKey.set(publicKeyBytes, ED25519_MULTICODEC_PREFIX.length);

        const encodedPublicKey = multibase.encode('base58btc', prefixedPublicKey);
        const encodedPublicKeyStr = Buffer.from(encodedPublicKey).toString('utf8');

        const did = `did:key:${encodedPublicKeyStr}`;
        const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');

        return { did, privateKey: privateKeyHex };
    } catch (err) {
        console.error('Failed to generate key pair:', err);
        throw new Error('Failed to generate key pair');
    }
}

export async function exportKeyPair(data: string, passphrase: string): Promise<string> {
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
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv,
            },
            derivedKey,
            stringToArrayBuffer(data)
        );

        const exportData = {
            salt: encode(salt.buffer as ArrayBuffer),
            iv: encode(iv.buffer as ArrayBuffer),
            encryptedData: encode(encryptedData),
        };

        console.log('crypto: Exported data:', exportData);
        return JSON.stringify(exportData);
    } catch (err : any) {
        console.error('crypto: Failed to export data:', err);
        throw new Error('Failed to export data: ' + (err.message || 'Unknown error'));
    }
}

export async function importKeyPair(encryptedData: string, passphrase: string): Promise<string> {
    try {
        const parsedData = JSON.parse(encryptedData);
        const { salt, iv, encryptedData: encrypted } = parsedData;

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

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: decode(iv),
            },
            derivedKey,
            decode(encrypted)
        );

        const decryptedString = arrayBufferToString(decryptedData);
        console.log('crypto: Decrypted data:', decryptedString);
        return decryptedString;
    } catch (err : any) {
        console.error('crypto: Failed to import data:', err);
        throw new Error('Failed to decrypt data: ' + (err.message || 'Unknown error'));
    }
}

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

export async function verifySignature(did: string, message: string, signatureHex: string): Promise<boolean> {
    try {
        const identifier = did.split('did:key:')[1];
        const publicKeyBytes = multibase.decode(identifier);
        const publicKey = publicKeyBytes.slice(2);
        const messageBytes = new TextEncoder().encode(message);
        const signature = Buffer.from(signatureHex, 'hex');
        return await ed25519.verify(signature, messageBytes, publicKey);
    } catch (err) {
        console.error('Failed to verify signature:', err);
        throw new Error('Failed to verify signature');
    }
}