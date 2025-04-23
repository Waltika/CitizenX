// src/shared/types/annotation.ts
export interface Comment {
    _id: string;        // Unique identifier for the comment (e.g., timestamp-based)
    text: string;       // The comment content
    timestamp: number;  // When the comment was created (Unix timestamp)
    did: string;        // The decentralized identifier (public key) of the commenter
}

export interface Annotation {
    _id: string;        // Unique identifier for the annotation (e.g., timestamp-based)
    url: string;        // The normalized URL of the page being annotated
    text: string;       // The annotation content
    timestamp: number;  // When the annotation was created (Unix timestamp)
    did?: string;       // The decentralized identifier (public key) of the creator; optional for backward compatibility
    comments?: Comment[]; // List of comments under the annotation
}