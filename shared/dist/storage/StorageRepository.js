// src/storage/StorageRepository.ts
import { GunRepository } from './GunRepository.js';
export class StorageRepository {
    repository;
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
    async initialize() {
        await this.repository.initialize();
    }
    async discoverPeers() {
        const gun = this.repository.getGunInstance();
        const knownPeers = await new Promise((resolve) => {
            const peers = new Set();
            gun.get('knownPeers').map().once((peer) => {
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
    async getCurrentDID() {
        return this.repository.getCurrentDID();
    }
    async setCurrentDID(did) {
        await this.repository.setCurrentDID(did);
    }
    async clearCurrentDID() {
        await this.repository.clearCurrentDID();
    }
    async saveProfile(profile) {
        await this.repository.saveProfile(profile);
    }
    async getProfile(did) {
        return this.repository.getProfile(did);
    }
    async getAnnotations(url, callback) {
        return this.repository.getAnnotations(url, callback);
    }
    async saveAnnotation(annotation) {
        await this.repository.saveAnnotation(annotation);
    }
    async deleteAnnotation(url, id) {
        await this.repository.deleteAnnotation(url, id);
    }
    async saveComment(url, annotationId, comment) {
        await this.repository.saveComment(url, annotationId, comment);
    }
}
