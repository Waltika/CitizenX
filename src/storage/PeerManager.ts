// PeerManager.ts
interface KnownPeer {
    url: string;
    timestamp: number;
}

interface PeerStatus {
    url: string;
    connected: boolean;
    lastSeen?: number;
}

export class PeerManager {
    private gun: any;
    private currentPeers: string[] | undefined;
    private initialPeers: string[];
    private isConnected: boolean = false;
    private lastLogTime: Map<string, number> = new Map();
    private fetchAttempts: number = 0;
    private maxFetchAttempts: number = 10;
    private STORAGE_KEY = 'gun_repository_state';

    constructor(gun: any, initialPeers: string[], fallbackPeers: string[]) {
        this.gun = gun;
        this.currentPeers = initialPeers;
        this.initialPeers = fallbackPeers;
    }

    private throttleLog(message: string, interval: number = 60000): boolean {
        const now = Date.now();
        const lastTime = this.lastLogTime.get(message) || 0;
        if (now - lastTime < interval) {
            return false;
        }
        this.lastLogTime.set(message, now);
        return true;
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

    startConnectionCheck(): void {
        setInterval(async () => {
            const storedState = await this.getStoredState();
            if (!this.isConnected && storedState.initialized) {
                console.log('PeerManager: Connection lost, attempting to reconnect...');
                const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...this.initialPeers])];
                if (!this.arraysEqual(updatedPeers, this.currentPeers)) {
                    this.currentPeers = updatedPeers;
                    console.log('PeerManager: Reverted to initial peers:', this.currentPeers);
                    this.gun.opt({ peers: this.currentPeers });
                }
                this.discoverPeers();
            }
        }, 30 * 1000);
    }

    discoverPeers(): void {
        this.fetchKnownPeers().then((peers) => {
            const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...peers, ...this.initialPeers])];
            if (this.arraysEqual(updatedPeers, this.currentPeers)) {
                console.log('PeerManager: Initial peer list unchanged:', this.currentPeers);
                return;
            }
            this.currentPeers = updatedPeers;
            console.log('PeerManager: Discovered initial peers:', this.currentPeers);
            this.gun.opt({ peers: this.currentPeers });
        });

        let lastUpdateTime = 0;
        const throttleInterval = 30 * 1000;

        this.gun.get('knownPeers').map().on((peer: KnownPeer, id: string) => {
            const now = Date.now();
            if (now - lastUpdateTime < throttleInterval) {
                return;
            }

            if (!peer || !peer.url || !peer.timestamp) {
                if (this.throttleLog(`Ignore null peer ${id}`)) {
                    console.log('PeerManager: Removing null or invalid peer entry:', id);
                    this.gun.get('knownPeers').get(id).put(null);
                }
                return;
            }

            const age = now - peer.timestamp;
            if (age > 10 * 60 * 1000) {
                console.log('PeerManager: Removing expired peer:', peer.url);
                this.gun.get('knownPeers').get(id).put(null);
                return;
            }

            this.fetchKnownPeers().then((peers) => {
                const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...peers, ...this.initialPeers])];
                if (this.arraysEqual(updatedPeers, this.currentPeers)) {
                    if (this.throttleLog('Peer list unchanged after update')) {
                        console.log('PeerManager: Peer list unchanged after update:', this.currentPeers);
                    }
                    return;
                }
                this.currentPeers = updatedPeers;
                console.log('PeerManager: Updated peers list:', this.currentPeers);
                this.gun.opt({ peers: this.currentPeers });
                lastUpdateTime = now;
            });
        });

        const clientPeerId = `client-${Date.now()}`;
        setInterval(() => {
            const now = Date.now();
            this.gun.get('knownPeers').get(clientPeerId).put({
                url: 'client-peer',
                timestamp: now,
            }, (ack: any) => {
                if (ack.err) {
                    console.error('PeerManager: Failed to register client peer:', ack.err);
                } else {
                    console.log('PeerManager: Registered client peer:', clientPeerId);
                }
            });
        }, 5 * 60 * 1000);
    }

    private async fetchKnownPeers(): Promise<string[]> {
        const storedState = await this.getStoredState();
        if (storedState.initialized && !storedState.peerConnected && this.fetchAttempts >= this.maxFetchAttempts) {
            if (this.throttleLog('Max fetch attempts reached')) {
                console.warn('PeerManager: Max fetch attempts reached, stopping retries');
            }
            return [];
        }

        if (!this.isConnected) {
            console.log('PeerManager: Waiting for connection before fetching knownPeers...');
            await new Promise((resolve) => {
                this.gun.on('hi', () => resolve(null));
                setTimeout(() => {
                    console.warn('PeerManager: Connection timeout in fetchKnownPeers, proceeding');
                    resolve(null);
                }, 5000);
            });
        }

        const maxRetries = 5;
        let attempt = 0;
        this.fetchAttempts++;

        while (attempt < maxRetries) {
            attempt++;
            const peers: string[] = await new Promise((resolve) => {
                const peerList: string[] = [];
                this.gun.get('knownPeers').map().once((peer: KnownPeer, id: string) => {
                    console.log('PeerManager: Raw peer data from knownPeers:', id, peer);
                    if (!peer || !peer.url || !peer.timestamp) {
                        return;
                    }
                    const now = Date.now();
                    const age = now - peer.timestamp;
                    if (age <= 10 * 60 * 1000) {
                        peerList.push(peer.url);
                        console.log('PeerManager: Found valid peer:', peer.url, 'Age:', age / 1000, 'seconds');
                    } else {
                        console.log('PeerManager: Skipping stale peer in fetch:', peer.url, 'Age:', age / 1000, 'seconds');
                    }
                });
                setTimeout(() => resolve(peerList), 5000);
            });

            if (peers.length > 0) {
                this.fetchAttempts = 0;
                await this.updateStoredState({ initialized: true, peerConnected: true });
                return peers;
            }

            if (attempt === maxRetries) {
                console.log('PeerManager: No valid peers found in knownPeers after', attempt, 'attempts');
                await this.updateStoredState({ initialized: true, peerConnected: false });
                return [];
            }

            if (this.throttleLog('Retry fetchKnownPeers')) {
                console.log('PeerManager: Retrying fetchKnownPeers, attempt:', attempt);
            }
            const delay = 2000 * Math.pow(1.5, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.log('PeerManager: No valid peers found in knownPeers after all retries');
        await this.updateStoredState({ initialized: true, peerConnected: false });
        return [];
    }

    private arraysEqual(arr1: string[] | undefined, arr2: string[] | undefined): boolean {
        if (arr1 === undefined && arr2 === undefined) return true;
        if (arr1 === undefined || arr2 === undefined) return false;
        if (arr1.length !== arr2.length) return false;
        return arr1.every((value, index) => value === arr2[index]);
    }

    addPeers(newPeers: string[]): void {
        const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...newPeers, ...this.initialPeers])];
        if (this.arraysEqual(updatedPeers, this.currentPeers)) {
            console.log('PeerManager: No new peers to add:', this.currentPeers);
            return;
        }
        this.currentPeers = updatedPeers;
        this.gun.opt({ peers: this.currentPeers });
        console.log('Updated peers:', this.currentPeers);
    }

    async getPeerStatus(): Promise<PeerStatus[]> {
        const statuses: PeerStatus[] = [];
        const storedState = await this.getStoredState();

        if (!this.currentPeers) {
            console.log('PeerManager: No current peers to check status for');
            return statuses;
        }

        for (const peerUrl of this.currentPeers) {
            // Note: Gun.js doesn't provide a direct API to check peer status.
            // We infer status based on the `isConnected` state and recent activity.
            const isPeerConnected = this.isConnected && storedState.peerConnected;
            const lastSeen = storedState.peerConnected ? Date.now() : undefined;

            statuses.push({
                url: peerUrl,
                connected: isPeerConnected,
                lastSeen,
            });

            console.log(`PeerManager: Peer status - URL: ${peerUrl}, Connected: ${isPeerConnected}, Last Seen: ${lastSeen || 'N/A'}`);
        }

        return statuses;
    }

    setConnected(connected: boolean): void {
        this.isConnected = connected;
    }
}