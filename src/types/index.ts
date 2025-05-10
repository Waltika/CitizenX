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
    screenshot?: string;
    signature?: string;
    nonce?: string; // Added for SEA signing
    metadata?: {
        title: string;
        favicon: string | null;
        ogTitle: string | null;
        ogDescription: string | null;
        ogImage: string | null;
        twitterTitle: string | null;
        twitterDescription: string | null;
        twitterImage: string | null;
    };
}

export interface Comment {
    annotationId: string;
    content: string | TrustedHTML;
    id: string;
    author: string;
    timestamp: number;
    isDeleted: boolean;
    signature?: string;
    nonce?: string; // Added for SEA signing
}

export interface TrustedHTML {
    __html: string;
}