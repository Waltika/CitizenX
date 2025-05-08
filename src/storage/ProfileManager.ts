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
                    }, 1000);
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

    async getProfile(did: string, retries = 5, delay = 500): Promise<Profile | null> {
        const totalStartTime = Date.now();
        console.log(`[Timing] Starting getProfile for DID: ${did} at ${new Date().toISOString()}`);

        for (let attempt = 1; attempt <= retries; attempt++) {
            const attemptStartTime = Date.now();
            const result = await new Promise<Profile | null>((resolve) => {
                let nodesProcessed = 0;
                const totalNodes = 2; // Two queries: 'profiles' and 'user_${did}/profile'
                let profileFound = false;

                const timeout = setTimeout(() => {
                    console.log(`Profile fetch attempt ${attempt}/${retries} for DID: ${did} timed out after 2000ms`);
                    if (!profileFound) {
                        nodesProcessed = totalNodes;
                        resolve(null);
                    }
                }, 2000); // Increased timeout to 2000ms

                // First query: gun.get('profiles').get(did)
                this.gun.get('profiles').get(did).once((data: any) => {
                    if (profileFound) return; // Skip if profile already found
                    if (data && data.did && data.handle) {
                        console.log('ProfileManager: Loaded profile from profiles for DID:', did, data);
                        profileFound = true;
                        clearTimeout(timeout);
                        resolve({ did: data.did, handle: data.handle, profilePicture: data.profilePicture });
                        return;
                    }
                    console.log(`ProfileManager: No profile found in profiles for DID on attempt ${attempt}:`, did, data);
                    nodesProcessed++;
                    if (nodesProcessed === totalNodes && !profileFound) {
                        clearTimeout(timeout);
                        resolve(null);
                    }
                });

                // Second query: gun.get(`user_${did}`).get('profile')
                this.gun.get(`user_${did}`).get('profile').once((data: any) => {
                    if (profileFound) return; // Skip if profile already found
                    if (data && data.did && data.handle) {
                        console.log('ProfileManager: Loaded profile from user_${did}/profile for DID:', did, data);
                        profileFound = true;
                        clearTimeout(timeout);
                        resolve({ did: data.did, handle: data.handle, profilePicture: data.profilePicture });
                        return;
                    }
                    console.log(`ProfileManager: No profile found in user_${did}/profile for DID on attempt ${attempt}:`, did, data);
                    nodesProcessed++;
                    if (nodesProcessed === totalNodes && !profileFound) {
                        clearTimeout(timeout);
                        resolve(null);
                    }
                });

                // If no data after a short delay, resolve as null
                setTimeout(() => {
                    if (nodesProcessed === 0 && !profileFound) {
                        console.warn('ProfileManager: No profile data emitted for DID on attempt', attempt, did);
                        clearTimeout(timeout);
                        resolve(null);
                    }
                }, 100);
            });

            const attemptEndTime = Date.now();
            console.log(`[Timing] Profile fetch attempt ${attempt}/${retries} for DID: ${did} took ${attemptEndTime - attemptStartTime}ms`);

            if (result) {
                const totalEndTime = Date.now();
                console.log(`[Timing] Total getProfile time for DID: ${did}: ${totalEndTime - totalStartTime}ms`);
                return result;
            }

            console.log(`ProfileManager: Retrying getProfile for DID: ${did}, attempt ${attempt}/${retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.error('ProfileManager: Failed to load profile for DID after retries:', did);
        const totalEndTime = Date.now();
        console.log(`[Timing] Total getProfile time for DID: ${did} (failed): ${totalEndTime - totalStartTime}ms`);
        return null;
    }
}