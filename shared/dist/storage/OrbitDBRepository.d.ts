import { StorageRepository, Annotation, Comment, Profile } from './StorageRepository';
export declare class OrbitDBRepository implements StorageRepository {
    private db;
    private ready;
    private updateCallbacks;
    initialize(): Promise<void>;
    isReady(): boolean;
    onUpdate(callback: () => void): void;
    offUpdate(): void;
    saveAnnotation(annotation: Annotation): Promise<void>;
    loadAnnotations(): Promise<Annotation[]>;
    deleteAnnotation(annotationId: string): Promise<void>;
    saveComment(annotationId: string, comment: Comment): Promise<void>;
    saveProfile(profile: Profile): Promise<void>;
    loadProfile(did: string): Promise<Profile | null>;
    loadAllProfiles(): Promise<{
        [did: string]: {
            handle: string;
            profilePicture: string;
        };
    }>;
}
