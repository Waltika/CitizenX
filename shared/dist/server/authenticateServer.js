import { generateDID, validateDID } from '../utils/did.js';
export async function authenticateServer({ gun, did }) {
    if (did) {
        if (!validateDID(did)) {
            throw new Error('Invalid DID format');
        }
        return { did, privateKey: '' }; // Private key not returned to client
    }
    const { did: newDid, privateKey } = await generateDID();
    if (!validateDID(newDid)) {
        throw new Error('Generated DID is invalid');
    }
    gun.get('users').get(newDid).put({ did: newDid });
    return { did: newDid, privateKey };
}
