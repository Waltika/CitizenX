interface ProfileServerProps {
    gun: any;
    did: string;
    handle: string;
    profilePicture?: string;
}
export declare function saveProfileServer({ gun, did, handle, profilePicture }: ProfileServerProps): Promise<void>;
export {};
