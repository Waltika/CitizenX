interface UseProfileModalProps {
    profile: {
        handle: string;
        profilePicture: string;
    } | null;
    createProfile: (handle: string, profilePicture: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture: string) => Promise<void>;
}
interface UseProfileModalResult {
    isProfileModalOpen: boolean;
    setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    newHandle: string;
    setNewHandle: React.Dispatch<React.SetStateAction<string>>;
    newProfilePicture: string;
    setNewProfilePicture: React.Dispatch<React.SetStateAction<string>>;
    profileError: string;
    setProfileError: React.Dispatch<React.SetStateAction<string>>;
    handleProfileSubmit: () => Promise<void>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export declare function useProfileModal({ profile, createProfile, updateProfile, }: UseProfileModalProps): UseProfileModalResult;
export {};
