// src/background/services/profiles/types.ts
export interface Profile {
    uid: string;
    displayName?: string;
    profilePicture?: string;
}

export interface ProfileServiceInterface {
    getProfile(uid: string): Promise<Profile>;
    setProfile(profile: Profile): Promise<void>;
}