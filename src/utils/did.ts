// src/utils/did.ts
import * as multibase from 'multibase';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { Buffer } from 'buffer';

// Configure @noble/ed25519 to use the SHA-512 implementation from @noble/hashes
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));
ed25519.etc.sha512Async = (...m) => Promise.resolve(sha512(ed25519.etc.concatBytes(...m)));

// Ed25519 multicodec prefix for did:key (0xED01 for Ed25519)
const ED25519_MULTICODEC_PREFIX = [0xED, 0x01];

// Generate a DID using the did:key method with an Ed25519 key pair
export async function generateDID(): Promise<{ did: string; privateKey: string }> {
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

        console.log('Generated DID:', did);
        return { did, privateKey: privateKeyHex };
    } catch (err: any) {
        console.error('Error generating DID:', err);
        throw new Error('Failed to generate DID');
    }
}

// Validate a DID (basic validation for the did:key method with Ed25519)
export function validateDID(did: string): boolean {
    try {
        if (!did.startsWith('did:key:')) {
            throw new Error('Invalid DID format: must start with did:key:');
        }

        const identifier = did.split('did:key:')[1];
        if (!identifier || !identifier.startsWith('z')) {
            throw new Error('Invalid DID: identifier must be multibase-encoded (base58btc, prefix z)');
        }

        // Decode the multibase identifier
        const decoded = multibase.decode(identifier);
        console.log('Decoded DID identifier bytes:', Array.from(decoded));

        // Check if the key type is Ed25519 (first two bytes should be 0xED01)
        if (decoded[0] !== ED25519_MULTICODEC_PREFIX[0] || decoded[1] !== ED25519_MULTICODEC_PREFIX[1]) {
            throw new Error('Invalid DID: key type must be Ed25519');
        }

        // Ensure the public key is 32 bytes (Ed25519 public key length) + 2 bytes for multicodec prefix
        if (decoded.length !== 32 + ED25519_MULTICODEC_PREFIX.length) {
            throw new Error('Invalid DID: Ed25519 public key must be 32 bytes');
        }

        return true;
    } catch (err: any) {
        console.error('DID validation error:', err.message);
        return false;
    }
}