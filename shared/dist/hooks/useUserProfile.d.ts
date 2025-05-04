import { ProfileType } from '../types/index.js';
interface UseUserProfileReturn {
    did: string | null;
    profile: ProfileType | null;
    loading: boolean;
    error: string | null;
    authenticate: () => Promise<void>;
    signOut: () => void;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture?: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture?: string) => Promise<void>;
}
export declare const useUserProfile: () => UseUserProfileReturn;
export {};
