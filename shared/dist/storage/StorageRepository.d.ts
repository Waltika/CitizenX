import { AnnotationType, CommentType, ProfileType } from '../types/index.js';
export declare class StorageRepository {
    private repository;
    constructor();
    initialize(): Promise<void>;
    discoverPeers(): Promise<void>;
    getCurrentDID(): Promise<string | null>;
    setCurrentDID(did: string): Promise<void>;
    clearCurrentDID(): Promise<void>;
    saveProfile(profile: ProfileType): Promise<void>;
    getProfile(did: string): Promise<ProfileType | null>;
    getAnnotations(url: string, callback?: (annotations: AnnotationType[]) => void): Promise<AnnotationType[]>;
    saveAnnotation(annotation: AnnotationType): Promise<void>;
    deleteAnnotation(url: string, id: string): Promise<void>;
    saveComment(url: string, annotationId: string, comment: CommentType): Promise<void>;
}
