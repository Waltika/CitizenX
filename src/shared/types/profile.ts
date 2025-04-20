// src/shared/types/profile.ts
export interface Profile {
    uid: string; // MetaMask address or anonymous ID
    displayName?: string; // e.g., "Jordan Lee"
    profilePicture?: string; // URL or IPFS CID
}