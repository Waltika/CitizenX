import { GunRepository } from './GunRepository';
import { Annotation, Comment, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

interface PeerStatus {
    url: string;
    connected: boolean;
    lastSeen?: number;
}

export class StorageRepositorySingleton {
    private static instance: StorageRepository;

    private constructor() {}

    static getInstance(): StorageRepository {
        if (!StorageRepositorySingleton.instance) {
            StorageRepositorySingleton.instance = new StorageRepository();
        }
        return StorageRepositorySingleton.instance;
    }
}

export class StorageRepository {
    private repository: GunRepository;
    private initialized: boolean = false;
    private initializing: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    private STORAGE_KEY = 'storage_repository_state';

    constructor() {
        const bootstrapPeers = [
            'https://citizen-x-bootsrap.onrender.com/gun',
        ];

        this.repository = new GunRepository({
            peers: bootstrapPeers,
            radisk: false,
        });
    }

    private async getStoredState(): Promise<{ initialized: boolean }> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.STORAGE_KEY], (result) => {
                const state = result[this.STORAGE_KEY] || { initialized: false };
                resolve(state);
            });
        });
    }

    private async updateStoredState(state: { initialized: boolean }): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: state }, () => {
                resolve();
            });
        });
    }

    async initialize(): Promise<void> {
        const storedState = await this.getStoredState();
        if (storedState.initialized) {
            this.initialized = true;
            return;
        }

        if (this.initializing) {
            return this.initializationPromise!;
        }

        this.initializing = true;
        this.initializationPromise = this.repository.initialize().then(() => {
            this.initialized = true;
            this.initializing = false;
            this.updateStoredState({ initialized: true });
        }).catch((error) => {
            console.warn('StorageRepository: Initialization failed, proceeding with local storage:', error);
            this.initialized = true;
            this.initializing = false;
            this.initializationPromise = null;
            this.updateStoredState({ initialized: true });
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

    async getPeerStatus(): Promise<PeerStatus[]> {
        await this.initialize();
        return this.repository.getPeerStatus();
    }

    async getAnnotations(url: string): Promise<Annotation[]>;
    async getAnnotations(url: string, callback: (annotations: Annotation[]) => void): Promise<() => void>;
    async getAnnotations(url: string, callback?: (annotations: Annotation[]) => void): Promise<Annotation[] | (() => void)> {
        await this.initialize();
        const normalizedUrl = normalizeUrl(url);
        return this.repository.getAnnotations(normalizedUrl, callback);
    }

    async saveAnnotation(annotation: Annotation, tabId?: number): Promise<void> {
        await this.initialize();
        const normalizedAnnotation = { ...annotation, url: normalizeUrl(annotation.url) };
        await this.repository.saveAnnotation(normalizedAnnotation, tabId);
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        await this.initialize();
        const normalizedUrl = normalizeUrl(url);
        await this.repository.deleteAnnotation(normalizedUrl, id);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        await this.initialize();
        const normalizedUrl = normalizeUrl(url);
        await this.repository.saveComment(normalizedUrl, annotationId, comment);
    }

    async deleteComment(url: string, annotationId: string, commentId: string): Promise<void> {
        await this.initialize();
        const normalizedUrl = normalizeUrl(url);
        const requesterDID = await this.getCurrentDID();
        if (!requesterDID) {
            throw new Error('No user DID found. Please authenticate.');
        }
        await this.repository.deleteComment(normalizedUrl, annotationId, commentId, requesterDID);
    }

    cleanupAnnotationsListeners(url: string): void {
        this.repository.cleanupAnnotationsListeners(url);
    }
}

export const storage = StorageRepositorySingleton.getInstance();