// src/types/index.ts
export interface Profile {
    did: string;
    handle: string;
    profilePicture?: string;
}

export interface Annotation {
    author: string;
    content: string;
    id: string;
    url: string;
    text: string;
    timestamp: number;
    comments: Comment[];
    isDeleted: boolean;
}

export interface Comment {
    text: string;
    content: string | TrustedHTML;
    id: string;
    author: string;
    timestamp: number;
    isDeleted: boolean;
}

