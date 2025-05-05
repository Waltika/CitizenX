// src/utils/__tests__/did.test.ts
import { generateDID, validateDID } from '../did';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import * as multibase from 'multibase';
import { Buffer } from 'buffer';

// Mock the SHA-512 implementation for @noble/ed25519
beforeAll(() => {
    ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));
    ed25519.etc.sha512Async = (...m) => Promise.resolve(sha512(ed25519.etc.concatBytes(...m)));
});

describe('DID Generation and Validation', () => {
    it('should generate a valid DID with Ed25519 key', async () => {
        const { did, privateKey } = await generateDID();

        // Check DID format
        expect(did).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
        expect(privateKey).toMatch(/^[0-9a-fA-F]+$/);

        // Validate the DID
        const isValid = validateDID(did);
        expect(isValid).toBe(true);
    });

    it('should validate a correctly formatted Ed25519 DID', () => {
        const did = 'did:key:z6MkreEwyuVJW8bLP9WaKfKunp1MGJorpQUafNn7KQ3bo9wT';
        const isValid = validateDID(did);
        expect(isValid).toBe(true);
    });

    it('should reject an invalid DID format', () => {
        const did = 'did:invalid:z6MkreEwyuVJW8bLP9WaKfKunp1MGJorpQUafNn7KQ3bo9wT';
        const isValid = validateDID(did);
        expect(isValid).toBe(false);
    });

    it('should reject a DID with incorrect key type', async () => {
        // Generate a DID with a fake multicodec prefix (e.g., 0xEC01 instead of 0xED01)
        const privateKeyBytes = ed25519.utils.randomPrivateKey();
        const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);
        const prefixedPublicKey = new Uint8Array([0xEC, 0x01, ...publicKeyBytes]);
        const encodedPublicKey = multibase.encode('base58btc', prefixedPublicKey);
        const encodedPublicKeyStr = Buffer.from(encodedPublicKey).toString('utf8');
        const did = `did:key:${encodedPublicKeyStr}`;

        const isValid = validateDID(did);
        expect(isValid).toBe(false);
    });
});