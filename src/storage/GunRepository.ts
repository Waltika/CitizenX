import Gun from 'gun';
import 'gun/lib/webrtc';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import SEA from 'gun/sea';
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
        'https://citizen-x-bootsrap.onrender.com/gun',
        'https://gun-manhattan.herokuapp.com/gun',
        'https://peer1.gun.eco/gun',
        'https://peer2.gun.eco/gun'
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
            localStorage: false,
            file: 'gun-data',
            webrtc: true,
        });

        if (!this.gun.SEA) {
            console.warn('GunRepository: Attaching SEA manually');
            this.gun.SEA = SEA;
        }

        console.log('GunRepository: Initialized gun instance with SEA:', !!this.gun.SEA);
        if (!this.gun.SEA) {
            console.error('GunRepository: SEA module not loaded on gun instance');
        }

        this.peerManager = new PeerManager(this.gun, this.options.peers ?? [], this.initialPeers);
        this.annotationManager = new AnnotationManager(this.gun);
        this.commentManager = new CommentManager(this.gun);
        this.profileManager = new ProfileManager(this.gun);
        this.cleanupManager = new CleanupManager(this.gun);

        this.peerManager.startConnectionCheck();
        this.cleanupManager.startCleanupJob();

        this.gun.on('out', (msg: any) => {
            if (msg.err === 'WebSocket disconnected') {
                console.log('GunRepository: Detected WebSocket disconnection, triggering reconnect');
                this.peerManager.handleConnectionLost();
            }
        });
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
            await this.cleanupManager.migrateAnnotations();
            return;
        }

        if (this.initializationResolve) {
            console.log('GunRepository: Already initializing, waiting for existing promise');
            return new Promise((resolve) => {
                this.initializationResolve = resolve;
            });
        }

        console.log('GunRepository: Initializing with peers:', this.options.peers);
        return new Promise((resolve) => {
            this.initializationResolve = resolve;

            const onHi = (peer: any) => {
                console.log('GunRepository: Connected to peer:', peer.url);
                this.peerManager.setConnected(true);
                this.updateStoredState({ initialized: true, peerConnected: true });
                this.cleanupListeners?.();
                this.initializationResolve?.();
                this.initializationResolve = null;
            };

            const onBye = (peer: any) => {
                console.log('GunRepository: Disconnected from peer:', peer.url);
                this.peerManager.setConnected(false);
                this.updateStoredState({ initialized: true, peerConnected: false });
                this.peerManager.handleConnectionLost();
            };

            this.gun.on('hi', onHi);
            this.gun.on('bye', onBye);

            const timeout = setTimeout(() => {
                console.warn('GunRepository: No connection established after 10s, proceeding with local storage');
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
            await this.peerManager.discoverPeers();
            await this.cleanupManager.migrateAnnotations();
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

    async saveAnnotation(annotation: Annotation, tabId?: number, captureScreenshot: boolean = true, did?: string, keyPair?: { pub: string; priv: string }): Promise<void> {
        console.log('GunRepository: saveAnnotation called with tabId:', tabId, 'captureScreenshot:', captureScreenshot, 'did:', did);
        if (!did || !keyPair) {
            throw new Error('DID and keyPair are required for signing annotations');
        }
        await this.annotationManager.saveAnnotation(annotation, tabId, captureScreenshot, did, keyPair);
    }

    async deleteAnnotation(url: string, id: string, did: string, keyPair: { pub: string; priv: string }): Promise<void> {
        return this.annotationManager.deleteAnnotation(url, id, did, keyPair);
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