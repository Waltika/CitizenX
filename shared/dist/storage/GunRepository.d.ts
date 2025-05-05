import 'gun/lib/webrtc.js';
import { AnnotationType, CommentType, ProfileType } from '../types/index.js';
type AnnotationUpdateCallback = (annotations: AnnotationType[]) => void;
interface GunRepositoryOptions {
    peers?: string[];
    radisk?: boolean;
}
export declare class GunRepository {
    private gun;
    private options;
    private annotationCallbacks;
    constructor(options?: GunRepositoryOptions);
    initialize(): Promise<void>;
    private discoverPeers;
    private fetchKnownPeers;
    getGunInstance(): any;
    addPeers(newPeers: string[]): void;
    getCurrentDID(): Promise<string | null>;
    setCurrentDID(did: string): Promise<void>;
    clearCurrentDID(): Promise<void>;
    saveProfile(profile: ProfileType): Promise<void>;
    getProfile(did: string, retries?: number, delay?: number): Promise<ProfileType | null>;
    getAnnotations(url: string, callback?: AnnotationUpdateCallback): Promise<AnnotationType[]>;
    saveAnnotation(annotation: AnnotationType): Promise<void>;
    deleteAnnotation(url: string, id: string): Promise<void>;
    saveComment(url: string, annotationId: string, comment: CommentType): Promise<void>;
}
export {};
