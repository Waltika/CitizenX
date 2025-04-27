// src/shared/types/userProfile.ts
export interface Profile {
    _id: string; // The user's did (used as the key in OrbitDB)
    handle: string; // User-friendly name (e.g., "Alice")
    profilePicture: string; // Data URI or URL of the profile picture (e.g., "data:image/png;base64,...")
}