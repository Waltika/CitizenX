// src/storage/StorageRepository.ts
export interface Comment {
    _id: string;
    text: string;
    timestamp: number;
    [key: string]: any;
}

export interface Annotation {
    _id: string;
    text: string;
    timestamp: number;
    did: string;
    comments?: Comment[];
    [key: string]: any;
}

export interface Profile {
    _id: string;
    handle: string;
    profilePicture: string;
    [key: string]: any;
}

export interface StorageRepository {
    saveAnnotation(annotation: Annotation): Promise<void>;
    loadAnnotations(): Promise<Annotation[]>;
    deleteAnnotation(annotationId: string): Promise<void>;
    saveComment(annotationId: string, comment: Comment): Promise<void>;
    saveProfile(profile: Profile): Promise<void>;
    loadProfile(did: string): Promise<Profile | null>;
    loadAllProfiles(): Promise<{ [did: string]: { handle: string; profilePicture: string } }>;
    initialize(): Promise<void>;
    isReady(): boolean;
    onUpdate(callback: () => void): void;
    offUpdate(): void;
}