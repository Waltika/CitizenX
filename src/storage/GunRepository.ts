import Gun from 'gun';
import 'gun/lib/webrtc';
import { PeerManager } from './PeerManager';
import { AnnotationManager } from './AnnotationManager';
import { CommentManager } from './CommentManager';
import { ProfileManager } from './ProfileManager';
import { CleanupManager } from './CleanupManager';
import { Annotation, Profile, Comment } from '@/types';

interface PeerStatus {
    url: string;
    connected: boolean;
    lastSeen?: number;
}

interface GunRepositoryOptions {
    peers?: string[];
    radisk?: boolean;
}

export class GunRepository {
    private gun: any;
    private options: GunRepositoryOptions;
    private peerManager: PeerManager;
    private annotationManager: AnnotationManager;
    private commentManager: CommentManager;
    private profileManager: ProfileManager;
    private cleanupManager: CleanupManager;
    private initializationResolve: ((value?: void | PromiseLike<void>) => void) | null = null;
    private initialPeers: string[] = [
        'http://localhost:8765/gun',
        'https://citizen-x-bootsrap.onrender.com/gun',
        'https://gun-manhattan.herokuapp.com/gun',
        'https://relay.peer.ooo/gun',
    ];
    private STORAGE_KEY = 'gun_repository_state';

    constructor(options: GunRepositoryOptions = {}) {
        this.options = {
            peers: options.peers || this.initialPeers,
            radisk: options.radisk ?? true,
        };

        this.gun = Gun({
            peers: this.options.peers,
            radisk: this.options.radisk,
            localStorage: true,
            file: 'gun-data',
            webrtc: true,
        });

        this.peerManager = new PeerManager(this.gun, this.options.peers ?? [], this.initialPeers);
        this.annotationManager = new AnnotationManager(this.gun);
        this.commentManager = new CommentManager(this.gun);
        this.profileManager = new ProfileManager(this.gun);
        this.cleanupManager = new CleanupManager(this.gun);

        this.peerManager.startConnectionCheck();
        this.cleanupManager.startCleanupJob();
    }

    private async getStoredState(): Promise<{ initialized: boolean; peerConnected: boolean }> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.STORAGE_KEY], (result) => {
                const state = result[this.STORAGE_KEY] || { initialized: false, peerConnected: false };
                resolve(state);
            });
        });
    }

    private async updateStoredState(state: { initialized: boolean; peerConnected: boolean }): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.STORAGE_KEY]: state }, () => {
                resolve();
            });
        });
    }

    async initialize(): Promise<void> {
        const storedState = await this.getStoredState();
        if (storedState.initialized) {
            console.log('GunRepository: Already initialized, using stored state');
            this.peerManager.setConnected(storedState.peerConnected);
            await this.cleanupManager.migrateAnnotations(); // Run migration on startup
            return;
        }

        if (this.initializationResolve) {
            console.log('GunRepository: Already initializing, waiting for existing promise');
            return new Promise((resolve) => {
                this.initializationResolve = resolve;
            });
        }

        console.log('GunRepository: Initializing...');
        return new Promise((resolve) => {
            this.initializationResolve = resolve;

            const onHi = (peer: any) => {
                console.log('GunRepository: Connected to peer:', peer);
                this.peerManager.setConnected(true);
                this.updateStoredState({ initialized: true, peerConnected: true });
                this.cleanupListeners?.();
                this.initializationResolve?.();
                this.initializationResolve = null;
            };

            const onBye = (peer: any) => {
                console.log('GunRepository: Disconnected from peer:', peer);
                this.peerManager.setConnected(false);
                this.updateStoredState({ initialized: true, peerConnected: false });
            };

            this.gun.on('hi', onHi);
            this.gun.on('bye', onBye);

            const timeout = setTimeout(() => {
                console.warn('GunRepository: No connection established after timeout, proceeding with local storage');
                this.updateStoredState({ initialized: true, peerConnected: false });
                this.cleanupListeners?.();
                this.initializationResolve?.();
                this.initializationResolve = null;
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeout);
                this.gun.off('hi', onHi);
                this.gun.off('bye', onBye);
            };

            this.cleanupListeners = cleanup;
        }).then(async () => {
            console.log('GunRepository: Initialization complete, starting peer discovery');
            this.peerManager.discoverPeers();
            await this.cleanupManager.migrateAnnotations(); // Run migration after initialization
        });
    }

    private cleanupListeners: (() => void) | null = null;

    getGunInstance(): any {
        return this.gun;
    }

    addPeers(newPeers: string[]): void {
        this.peerManager.addPeers(newPeers);
    }

    async getPeerStatus(): Promise<PeerStatus[]> {
        return this.peerManager.getPeerStatus();
    }

    async getCurrentDID(): Promise<string | null> {
        return this.profileManager.getCurrentDID();
    }

    async setCurrentDID(did: string): Promise<void> {
        return this.profileManager.setCurrentDID(did);
    }

    async clearCurrentDID(): Promise<void> {
        return this.profileManager.clearCurrentDID();
    }

    async saveProfile(profile: Profile): Promise<void> {
        return this.profileManager.saveProfile(profile);
    }

    async getProfile(did: string): Promise<Profile | null> {
        return this.profileManager.getProfile(did);
    }

    async getAnnotations(url: string, callback?: (annotations: Annotation[]) => void): Promise<Annotation[]> {
        return this.annotationManager.getAnnotations(url, callback);
    }

    cleanupAnnotationsListeners(url: string): void {
        this.annotationManager.cleanupAnnotationsListeners(url);
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        return this.annotationManager.saveAnnotation(annotation);
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        return this.annotationManager.deleteAnnotation(url, id);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        return this.commentManager.saveComment(url, annotationId, comment);
    }

    async deleteComment(url: string, annotationId: string, commentId: string, requesterDID: string): Promise<void> {
        return this.commentManager.deleteComment(url, annotationId, commentId, requesterDID);
    }

    async inspectAnnotations(): Promise<void> {
        return this.cleanupManager.inspectAnnotations();
    }
}