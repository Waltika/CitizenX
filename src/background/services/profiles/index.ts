// src/background/services/profiles/index.ts
import { Profile } from './types';

export class ProfileService {
    private storageKey = 'citizenx_profile';

    async getProfile(uid: string): Promise<Profile> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const profiles: Record<string, Profile> = result[this.storageKey] || {};
                resolve(profiles[uid] || { uid });
            });
        });
    }

    async setProfile(profile: Profile): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const profiles: Record<string, Profile> = result[this.storageKey] || {};
                profiles[profile.uid] = profile;
                chrome.storage.local.set({ [this.storageKey]: profiles }, () => {
                    resolve();
                });
            });
        });
    }
}

export const profileService = new ProfileService();