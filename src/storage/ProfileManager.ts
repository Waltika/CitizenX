// ProfileManager.ts
import { Profile } from '@/types';

export class ProfileManager {
    private gun: any;

    constructor(gun: any) {
        this.gun = gun;
    }

    async getCurrentDID(): Promise<string | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get(['currentDID'], (result) => {
                const cachedDID = result.currentDID || null;
                console.log('ProfileManager: Retrieved cached DID from chrome.storage.local:', cachedDID);
                if (cachedDID) {
                    this.gun.get(`user_${cachedDID}`).get('did').once((data: any) => {
                        if (data && data.did === cachedDID) {
                            console.log('ProfileManager: Confirmed DID in user-specific namespace:', cachedDID);
                            resolve(cachedDID);
                        } else {
                            console.warn('ProfileManager: DID not found in user-specific namespace, but retaining in chrome.storage.local');
                            resolve(cachedDID);
                        }
                    });

                    setTimeout(() => {
                        console.warn('ProfileManager: Gun.js did not respond, using cached DID as fallback');
                        resolve(cachedDID);
                    }, 5000);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async setCurrentDID(did: string): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ currentDID: did }, () => {
                console.log('ProfileManager: Set current DID in chrome.storage.local:', did);

                this.gun.get(`user_${did}`).get('did').put({ did }, (ack: any) => {
                    if (ack.err) {
                        console.error('ProfileManager: Failed to set user-specific DID:', ack.err);
                        reject(new Error(ack.err));
                    } else {
                        console.log('ProfileManager: Set user-specific DID in Gun.js:', did);
                        resolve();
                    }
                });
            });
        });
    }

    async clearCurrentDID(): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.remove('currentDID', () => {
                console.log('ProfileManager: Cleared current DID from chrome.storage.local');
                resolve();
            });
        });
    }

    async saveProfile(profile: Profile): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get(`user_${profile.did}`).get('profile').put(profile, (ack: any) => {
                if (ack.err) {
                    console.error('ProfileManager: Failed to save profile:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('ProfileManager: Saved profile:', profile);
                    resolve();
                }
            });
        });
    }

    async getProfile(did: string, retries = 5, delay = 1000): Promise<Profile | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const result = await new Promise<Profile | null>((resolve) => {
                this.gun.get(`user_${did}`).get('profile').once((data: any) => {
                    if (data && data.did && data.handle) {
                        console.log('ProfileManager: Loaded profile for DID:', did, data);
                        resolve({ did: data.did, handle: data.handle, profilePicture: data.profilePicture });
                    } else {
                        console.warn('ProfileManager: Profile not found for DID on attempt', attempt, did, data);
                        resolve(null);
                    }
                });
            });

            if (result) {
                return result;
            }

            console.log(`ProfileManager: Retrying getProfile for DID: ${did}, attempt ${attempt}/${retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.error('ProfileManager: Failed to load profile for DID after retries:', did);
        return null;
    }
}