import SEA from 'gun/sea';
import * as multibase from 'multibase';
import { base58btc } from 'multiformats/bases/base58';
import { Buffer } from 'buffer';

export interface DIDResult {
    did: string;
    keyPair: { pub: string; priv: string };
}

export async function generateDID(): Promise<DIDResult> {
    try {
        // Generate SEA keypair
        const pair = await SEA.pair();
        const publicKey = pair.pub;
        const privateKey = pair.priv;

        // Encode public key as did:key
        const publicKeyBytes = Buffer.from(publicKey, 'base64');
        const multicodecPrefix = Buffer.from([0xED, 0x01]);
        const identifierBytes = Buffer.concat([multicodecPrefix, publicKeyBytes]);
        const identifier = multibase.encode('base58btc', identifierBytes);
        const did = `did:key:${Buffer.from(identifier).toString('utf8')}`;

        console.log('generateDID: Generated DID:', did);
        return { did, keyPair: { pub: publicKey, priv: privateKey } };
    } catch (error) {
        console.error('generateDID: Failed to generate DID:', error);
        throw new Error('Failed to generate DID');
    }
}

export function validateDID(did: string): boolean {
    try {
        if (!did.startsWith('did:key:')) {
            console.warn('validateDID: DID does not start with did:key:', did);
            return false;
        }

        const identifier = did.slice(8);
        const decoded = base58btc.decode(identifier);
        if (decoded[0] !== 0xED || decoded[1] !== 0x01) {
            console.warn('validateDID: Invalid multicodec prefix:', decoded);
            return false;
        }
        console.log('validateDID: Valid DID:', did);
        return true;
    } catch (error) {
        console.warn('validateDID: Invalid DID format:', did, error);
        return false;
    }
}