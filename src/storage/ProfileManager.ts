import { Profile } from '@/types';

export class ProfileManager {
    private gun: any;
    private DID_STORAGE_KEY = 'current_did';
    private RETRY_ATTEMPTS = 3;
    private RETRY_DELAY_MS = 2000;

    constructor(gun: any) {
        this.gun = gun;
    }

    async getCurrentDID(): Promise<string | null> {
        let did: string | null = null;

        // Try to fetch the DID from the Gun server with retries
        for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
            try {
                did = await new Promise<string | null>((resolve) => {
                    this.gun.get('current_did').once((data: any) => {
                        console.log('ProfileManager: Retrieved DID from Gun server:', data?.value);
                        resolve(data ? data.value : null);
                    });
                });

                if (did !== null) {
                    console.log('ProfileManager: Retrieved DID from Gun server:', did);
                    return did;
                }

                console.log(`ProfileManager: DID not found on server, attempt ${attempt}/${this.RETRY_ATTEMPTS}`);
                if (attempt < this.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
                }
            } catch (error) {
                console.error(`ProfileManager: Error fetching DID from server, attempt ${attempt}/${this.RETRY_ATTEMPTS}:`, error);
                if (attempt === this.RETRY_ATTEMPTS) break;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
            }
        }

        console.log('ProfileManager: Gun.js did not respond, using cached DID as fallback');
        // DID not found on server, fall back to chrome.storage.local
        did = await new Promise<string | null>((resolve) => {
            chrome.storage.local.get([this.DID_STORAGE_KEY], (result) => {
                const localDID = result[this.DID_STORAGE_KEY] || null;
                console.log('ProfileManager: Retrieved cached DID from chrome.storage.local:', localDID);
                resolve(localDID);
            });
        });

        if (did !== null) {
            console.log('ProfileManager: Retrieved cached DID from chrome.storage.local:', did);
            // Store the DID back to the Gun server (optional, retained for compatibility)
            console.log('ProfileManager: Storing DID back to server:', did);
            try {
                await this.setCurrentDID(did);
                console.log('ProfileManager: Successfully stored DID back to server');
            } catch (error) {
                console.error('ProfileManager: Failed to store DID back to server:', error);
            }
        }

        return did;
    }

    async setCurrentDID(did: string): Promise<void> {
        // Store the DID on the Gun server
        await new Promise<void>((resolve, reject) => {
            this.gun.get('current_did').put({ value: did }, (ack: any) => {
                if (ack.err) {
                    console.error('ProfileManager: Failed to set DID on server:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('ProfileManager: Set DID on server:', did);
                    resolve();
                }
            });
        });

        // Also store the DID in chrome.storage.local
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.set({ [this.DID_STORAGE_KEY]: did }, () => {
                if (chrome.runtime.lastError) {
                    console.error('ProfileManager: Failed to set DID in chrome.storage.local:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('ProfileManager: Set DID in chrome.storage.local:', did);
                    resolve();
                }
            });
        });
    }

    async clearCurrentDID(): Promise<void> {
        // Only clear the DID from chrome.storage.local, not Gun.js
        await new Promise<void>((resolve, reject) => {
            chrome.storage.local.remove(this.DID_STORAGE_KEY, () => {
                if (chrome.runtime.lastError) {
                    console.error('ProfileManager: Failed to clear DID from chrome.storage.local:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('ProfileManager: Cleared DID from chrome.storage.local');
                    resolve();
                }
            });
        });
    }

    async getProfile(did: string): Promise<Profile | null> {
        const startTime = Date.now();
        for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
            console.log(`[Timing] Starting getProfile for DID: ${did} at ${new Date().toISOString()}`);
            try {
                const profile = await new Promise<Profile | null>((resolve) => {
                    this.gun.get('profiles').get(did).once((data: any) => {
                        if (data && data.handle) {
                            console.log(`ProfileManager: Loaded profile from profiles for DID on attempt ${attempt}: ${did}`, data);
                            resolve({
                                did,
                                handle: data.handle,
                                profilePicture: data.profilePicture,
                            });
                        } else {
                            this.gun.get(`user_${did}`).get('profile').once((userData: any) => {
                                if (userData && userData.handle) {
                                    console.log(`ProfileManager: Loaded profile from user_${did}/profile for DID on attempt ${attempt}: ${did}`, userData);
                                    resolve({
                                        did,
                                        handle: userData.handle,
                                        profilePicture: userData.profilePicture,
                                    });
                                } else {
                                    console.log(`ProfileManager: No profile found in user_${did}/profile for DID on attempt ${attempt}: ${did}`, userData);
                                    resolve(null);
                                }
                            });
                        }
                    });
                });

                const attemptEndTime = Date.now();
                console.log(`[Timing] Profile fetch attempt ${attempt}/${this.RETRY_ATTEMPTS} for DID: ${did} took ${attemptEndTime - startTime}ms`);

                if (profile) {
                    const endTime = Date.now();
                    console.log(`[Timing] Total getProfile time for DID: ${did}: ${endTime - startTime}ms`);
                    return profile;
                }

                console.log(`ProfileManager: Retrying getProfile for DID: ${did}, attempt ${attempt}/${this.RETRY_ATTEMPTS}`);
                if (attempt < this.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
                }
            } catch (error) {
                console.error(`ProfileManager: Error fetching profile for DID on attempt ${attempt}/${this.RETRY_ATTEMPTS}: ${did}`, error);
                if (attempt === this.RETRY_ATTEMPTS) break;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
            }
        }

        console.error('ProfileManager: Failed to load profile for DID after retries:', did);
        const endTime = Date.now();
        console.log(`[Timing] Total getProfile time for DID: ${did}: ${endTime - startTime}ms`);
        return null;
    }

    async saveProfile(profile: Profile): Promise<void> {
        const did = profile.did;
        if (!did) {
            throw new Error('Profile must have a DID');
        }

        // Store the profile in both the 'profiles' node and the user-specific node
        await new Promise<void>((resolve, reject) => {
            this.gun.get('profiles').get(did).put({
                handle: profile.handle,
                profilePicture: profile.profilePicture || null,
            }, (ack: any) => {
                if (ack.err) {
                    console.error('ProfileManager: Failed to save profile to profiles node:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('ProfileManager: Saved profile to profiles node for DID:', did);
                    resolve();
                }
            });
        });

        await new Promise<void>((resolve, reject) => {
            this.gun.get(`user_${did}`).get('profile').put({
                handle: profile.handle,
                profilePicture: profile.profilePicture || null,
            }, (ack: any) => {
                if (ack.err) {
                    console.error('ProfileManager: Failed to save profile to user-specific node:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('ProfileManager: Saved profile to user-specific node for DID:', did);
                    resolve();
                }
            });
        });
    }
}