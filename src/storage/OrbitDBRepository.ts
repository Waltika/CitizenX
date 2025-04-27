// src/storage/OrbitDBRepository.ts
import { StorageRepository, Annotation, Comment, Profile } from './StorageRepository';
import { createOrbitDB } from '@orbitdb/core';
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { FaultTolerance } from '@libp2p/interface';
import { bootstrapNodes } from "../config/boostrap";

export class OrbitDBRepository implements StorageRepository {
    private db: any;
    private ready: boolean = false;
    private updateCallbacks: Array<() => void> = [];

    async initialize(): Promise<void> {
        try {
            console.log('OrbitDBRepository: Initializing...');
            const ipfs = await createHelia({
                libp2p: {
                    transports: [webSockets(), webRTC(), circuitRelayTransport()],
                    transportManager: { faultTolerance: FaultTolerance.NO_FATAL },
                    peerDiscovery: [
                        bootstrap({
                            list: bootstrapNodes,
                        }),
                    ],
                    services: {
                        identify: identify(),
                        pubsub: gossipsub(),
                    },
                },
            });
            console.log('OrbitDBRepository: IPFS initialized:', ipfs);

            const orbitdb = await createOrbitDB({ ipfs });
            const database = await orbitdb.open('citizenx-annotations', { type: 'documents' });
            console.log('OrbitDBRepository: Database opened:', database);

            await new Promise<void>((resolve) => {
                database.events.on('ready', () => {
                    console.log('OrbitDBRepository: Database ready');
                    this.ready = true;
                    resolve();
                });
            });

            this.db = database;

            this.db.events.on('update', () => {
                console.log('OrbitDBRepository: Database update event');
                this.updateCallbacks.forEach(callback => callback());
            });
        } catch (err: any) {
            console.error('OrbitDBRepository: Failed to initialize:', err);
            throw err;
        }
    }

    isReady(): boolean {
        return this.ready;
    }

    onUpdate(callback: () => void): void {
        this.updateCallbacks.push(callback);
    }

    offUpdate(): void {
        this.updateCallbacks = [];
        if (this.db) {
            this.db.events.off('update');
            this.db.close();
        }
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        if (!this.ready || !this.db) {
            throw new Error('OrbitDB not ready');
        }
        await this.db.put(annotation);
    }

    async loadAnnotations(): Promise<Annotation[]> {
        if (!this.ready || !this.db) {
            return [];
        }
        const orbitdbEntries: Annotation[] = [];
        for await (const doc of this.db.iterator()) {
            orbitdbEntries.push(doc);
        }
        return orbitdbEntries;
    }

    async deleteAnnotation(annotationId: string): Promise<void> {
        if (!this.ready || !this.db) {
            throw new Error('OrbitDB not ready');
        }
        await this.db.del(annotationId);
    }

    async saveComment(annotationId: string, comment: Comment): Promise<void> {
        if (!this.ready || !this.db) {
            throw new Error('OrbitDB not ready');
        }
        const annotation = await this.db.get(annotationId);
        if (annotation && annotation.length > 0) {
            const updatedAnnotation = { ...annotation[0], comments: [...(annotation[0].comments || []), comment] };
            await this.db.put(updatedAnnotation);
        }
    }

    async saveProfile(profile: Profile): Promise<void> {
        if (!this.ready || !this.db) {
            throw new Error('OrbitDB not ready');
        }
        await this.db.put({ ...profile, type: 'profile' });
    }

    async loadProfile(did: string): Promise<Profile | null> {
        if (!this.ready || !this.db) {
            return null;
        }
        const profile = await this.db.get(did);
        if (profile && profile.length > 0) {
            return { _id: profile[0]._id, handle: profile[0].handle, profilePicture: profile[0].profilePicture };
        }
        return null;
    }

    async loadAllProfiles(): Promise<{ [did: string]: { handle: string; profilePicture: string } }> {
        if (!this.ready || !this.db) {
            return {};
        }
        const orbitdbEntries: Profile[] = [];
        for await (const doc of this.db.iterator()) {
            orbitdbEntries.push(doc);
        }
        const profiles: { [did: string]: { handle: string; profilePicture: string } } = {};
        orbitdbEntries.forEach((record: any) => {
            if (record.type === 'profile') {
                profiles[record._id] = { handle: record.handle || 'Unknown', profilePicture: record.profilePicture || '' };
            }
        });
        return profiles;
    }
}