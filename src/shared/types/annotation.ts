// src/shared/types/annotation.ts
export interface Annotation {
    _id: string;
    url: string;
    text: string;
    timestamp: number;
    walletAddress?: string; // Add walletAddress as an optional property
}