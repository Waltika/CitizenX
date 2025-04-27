// src/utils/did.ts

// Generate a random DID using the did:key method
export async function generateDID(): Promise<string> {
    try {
        // For simplicity, generate a random identifier (in a real app, use a proper DID method with cryptographic keys)
        const randomId = Math.random().toString(36).substring(2);
        const did = `did:key:${randomId}`;
        console.log('Generated DID:', did);
        return did;
    } catch (err: any) {
        console.error('Error generating DID:', err);
        throw new Error('Failed to generate DID');
    }
}

// Validate a DID (basic validation for the did:key method)
export function validateDID(did: string): boolean {
    try {
        if (!did.startsWith('did:key:')) {
            throw new Error('Invalid DID format: must start with did:key:');
        }
        const identifier = did.split('did:key:')[1];
        if (!identifier || identifier.length < 8) { // Arbitrary minimum length for the identifier
            throw new Error('Invalid DID: identifier too short');
        }
        return true;
    } catch (err: any) {
        console.error('DID validation error:', err.message);
        return false;
    }
}