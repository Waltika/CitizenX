import Gun from 'gun';
import { generateDID, validateDID } from '../utils/did.js';

interface AuthenticateServerProps {
    gun: any; // Use Gun type from @types/gun
    did?: string;
}

export async function authenticateServer({ gun, did }: AuthenticateServerProps): Promise<{ did: string, privateKey: string }> {
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