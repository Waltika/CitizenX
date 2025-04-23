// src/shared/types/annotation.ts
export interface Annotation {
    _id: string;
    url: string;
    text: string;
    timestamp: number;
    walletAddress?: string; // Stores the did; optional for backward compatibility
}