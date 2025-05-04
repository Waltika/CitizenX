// src/storage/StorageRepository.ts
import { GunRepository } from './GunRepository.js';
import { AnnotationType, CommentType, ProfileType } from '../types/index.js';

export class StorageRepository {
    private repository: GunRepository;

    constructor() {
        // Initial bootstrap node on Render
        const bootstrapPeers = [
            'https://citizen-x-bootsrap.onrender.com/gun',
        ];

        this.repository = new GunRepository({
            peers: bootstrapPeers,
            radisk: false,
        });

        // Dynamically discover additional peers from knownPeers
        this.discoverPeers();
    }

    async initialize(): Promise<void> {
        await this.repository.initialize();
    }

    async discoverPeers(): Promise<void> {
        const gun = this.repository.getGunInstance();
        const knownPeers = await new Promise<string[]>((resolve) => {
            const peers = new Set<string>();
            gun.get('knownPeers').map().once((peer: { url: string; timestamp: number }) => {
                if (peer && peer.url && peer.timestamp) {
                    const now = Date.now();
                    const age = now - peer.timestamp;
                    if (age <= 10 * 60 * 1000) {
                        peers.add(peer.url);
                    }
                }
            });
            setTimeout(() => resolve(Array.from(peers)), 2000);
        });

        console.log('Discovered peers:', knownPeers);

        if (knownPeers.length > 0) {
            this.repository.addPeers(knownPeers);
        }
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

    async saveProfile(profile: ProfileType): Promise<void> {
        await this.repository.saveProfile(profile);
    }

    async getProfile(did: string): Promise<ProfileType | null> {
        return this.repository.getProfile(did);
    }

    async getAnnotations(url: string, callback?: (annotations: AnnotationType[]) => void): Promise<AnnotationType[]> {
        return this.repository.getAnnotations(url, callback);
    }

    async saveAnnotation(annotation: AnnotationType): Promise<void> {
        await this.repository.saveAnnotation(annotation);
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        await this.repository.deleteAnnotation(url, id);
    }

    async saveComment(url: string, annotationId: string, comment: CommentType): Promise<void> {
        await this.repository.saveComment(url, annotationId, comment);
    }
}