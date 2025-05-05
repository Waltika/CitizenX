import { GunRepository } from './GunRepository';
import { Annotation, Comment, Profile } from '../types';

// Singleton instance
class StorageRepositorySingleton {
    private static instance: StorageRepository;

    private constructor() {}

    static getInstance(): StorageRepository {
        if (!StorageRepositorySingleton.instance) {
            StorageRepositorySingleton.instance = new StorageRepository();
        }
        return StorageRepositorySingleton.instance;
    }
}

class StorageRepository {
    private repository: GunRepository;
    private initialized: boolean = false;
    private initializing: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        const bootstrapPeers = [
            'https://citizen-x-bootsrap.onrender.com/gun',
        ];

        this.repository = new GunRepository({
            peers: bootstrapPeers,
            radisk: false,
        });
    }

    private normalizeUrl(url: string): string {
        let cleanUrl = url.replace(/^(https?:\/\/)+/, 'https://');
        cleanUrl = cleanUrl.replace(/\/+$/, '');
        const urlObj = new URL(cleanUrl);
        const params = new URLSearchParams(urlObj.search);
        for (const key of params.keys()) {
            if (key.startsWith('utm_')) {
                params.delete(key);
            }
        }
        urlObj.search = params.toString();
        return urlObj.toString();
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('StorageRepository: Already initialized');
            return;
        }

        if (this.initializing) {
            console.log('StorageRepository: Initialization already in progress, waiting...');
            return this.initializationPromise!;
        }

        console.log('StorageRepository: Initializing...');
        this.initializing = true;
        this.initializationPromise = this.repository.initialize().then(() => {
            this.initialized = true;
            this.initializing = false;
            console.log('StorageRepository: Initialized successfully');
        }).catch((error) => {
            console.error('StorageRepository: Initialization failed:', error);
            this.initialized = false;
            this.initializing = false;
            this.initializationPromise = null;
            throw error;
        });

        return this.initializationPromise;
    }

    async getCurrentDID(): Promise<string | null> {
        await this.initialize();
        return this.repository.getCurrentDID();
    }

    async setCurrentDID(did: string): Promise<void> {
        await this.initialize();
        await this.repository.setCurrentDID(did);
    }

    async clearCurrentDID(): Promise<void> {
        await this.initialize();
        await this.repository.clearCurrentDID();
    }

    async saveProfile(profile: Profile): Promise<void> {
        await this.initialize();
        await this.repository.saveProfile(profile);
    }

    async getProfile(did: string): Promise<Profile | null> {
        await this.initialize();
        return this.repository.getProfile(did);
    }

    async getAnnotations(url: string): Promise<Annotation[]> {
        await this.initialize();
        const normalizedUrl = this.normalizeUrl(url);
        console.log('StorageRepository: Fetching annotations for normalized URL:', normalizedUrl);
        return this.repository.getAnnotations(normalizedUrl);
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        await this.initialize();
        const normalizedAnnotation = { ...annotation, url: this.normalizeUrl(annotation.url) };
        await this.repository.saveAnnotation(normalizedAnnotation);
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        await this.initialize();
        const normalizedUrl = this.normalizeUrl(url);
        await this.repository.deleteAnnotation(normalizedUrl, id);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        await this.initialize();
        const normalizedUrl = this.normalizeUrl(url);
        await this.repository.saveComment(normalizedUrl, annotationId, comment);
    }
}

// Export the singleton instance
export const storage = StorageRepositorySingleton.getInstance();