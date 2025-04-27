import { GunRepository } from './GunRepository';
import { Annotation, Comment, Profile } from '../types';

export class StorageRepository {
    private repository: GunRepository;

    constructor() {
        this.repository = new GunRepository({
            peers: ['http://localhost:8765/gun'],
            radisk: false,
        });
    }

    async initialize(): Promise<void> {
        await this.repository.initialize();
    }

    async getCurrentDID(): Promise<string | null> {
        return this.repository.getCurrentDID();
    }

    async setCurrentDID(did: string): Promise<void> {
        await this.repository.setCurrentDID(did);
    }

    async clearCurrentDID(): Promise<void> {
        await this.repository.clearCurrentDID();
    }

    async saveProfile(profile: Profile): Promise<void> {
        await this.repository.saveProfile(profile);
    }

    async getProfile(did: string): Promise<Profile | null> {
        return this.repository.getProfile(did);
    }

    async getAnnotations(url: string): Promise<Annotation[]> {
        return this.repository.getAnnotations(url);
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        await this.repository.saveAnnotation(annotation);
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        await this.repository.deleteAnnotation(url, id);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        await this.repository.saveComment(url, annotationId, comment);
    }
}