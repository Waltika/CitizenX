import Gun from 'gun';
import { ProfileType } from '../types/index.js';

interface ProfileServerProps {
    gun: any;
    did: string;
    handle: string;
    profilePicture?: string;
}

export async function saveProfileServer({ gun, did, handle, profilePicture }: ProfileServerProps): Promise<void> {
    const profile: ProfileType = { did, handle, profilePicture };
    await new Promise<void>((resolve, reject) => {
        gun.get('profiles').get(did).put(profile, (ack: { err?: string }) => {
            if (ack.err) reject(new Error(ack.err));
            else resolve();
        });
    });
}