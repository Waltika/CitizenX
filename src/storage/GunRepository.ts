import Gun from 'gun';
import 'gun/lib/webrtc';
import { Annotation, Comment, Profile } from '@/types';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface GunRepositoryOptions {
    peers?: string[];
    radisk?: boolean;
}

interface KnownPeer {
    url: string;
    timestamp: number;
}

interface CallbackEntry {
    callbacks: AnnotationUpdateCallback[];
    cleanup?: () => void;
}

export class GunRepository {
    private gun: any;
    private options: GunRepositoryOptions;
    private annotationCallbacks: Map<string, CallbackEntry> = new Map();
    private currentPeers: string[] | undefined = [];
    private isConnected: boolean = false;
    private lastLogTime: Map<string, number> = new Map();
    private fetchAttempts: number = 0;
    private maxFetchAttempts: number = 10;
    private initializationResolve: ((value?: void | PromiseLike<void>) => void) | null = null;
    private initialPeers: string[] = ['https://citizen-x-bootsrap.onrender.com/gun'];

    constructor(options: GunRepositoryOptions = {}) {
        this.options = {
            peers: options.peers || this.initialPeers,
            radisk: options.radisk ?? true,
        };
        this.currentPeers = this.options.peers;
        this.gun = Gun({
            peers: this.currentPeers,
            radisk: this.options.radisk,
            localStorage: true,
            file: 'gun-data',
            webrtc: true,
        });

        this.startConnectionCheck();
        this.startCleanupJob();
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

    async initialize(): Promise<void> {
        if (this.initializationResolve) {
            console.log('GunRepository: Already initializing, waiting for existing promise');
            return new Promise((resolve) => {
                this.initializationResolve = resolve;
            });
        }

        console.log('GunRepository: Initializing...');
        return new Promise((resolve, reject) => {
            this.initializationResolve = resolve;

            const onHi = (peer: any) => {
                console.log('GunRepository: Connected to peer:', peer);
                this.isConnected = true;
                this.cleanupListeners?.();
                this.initializationResolve?.();
                this.initializationResolve = null;
            };

            const onBye = (peer: any) => {
                console.log('GunRepository: Disconnected from peer:', peer);
                this.isConnected = false;
            };

            this.gun.on('hi', onHi);
            this.gun.on('bye', onBye);

            const timeout = setTimeout(() => {
                if (!this.isConnected) {
                    console.warn('GunRepository: No connection established after timeout, proceeding anyway');
                    this.cleanupListeners?.();
                    this.initializationResolve?.();
                    this.initializationResolve = null;
                }
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeout);
                this.gun.off('hi', onHi);
                this.gun.off('bye', onBye);
            };

            this.cleanupListeners = cleanup;

            this.gun.on('error', (err: any) => {
                console.error('GunRepository: Error during initialization:', err);
                this.cleanupListeners?.();
                reject(err);
                this.initializationResolve = null;
            });
        }).then(() => {
            console.log('GunRepository: Initialization complete, starting peer discovery');
            this.discoverPeers();
        });
    }

    private cleanupListeners: (() => void) | null = null;

    private startConnectionCheck(): void {
        setInterval(() => {
            if (!this.isConnected) {
                console.log('GunRepository: Connection lost, attempting to reconnect...');
                const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...this.initialPeers])];
                if (!this.arraysEqual(updatedPeers, this.currentPeers)) {
                    this.currentPeers = updatedPeers;
                    console.log('GunRepository: Reverted to initial peers:', this.currentPeers);
                    this.gun.opt({ peers: this.currentPeers });
                }
                this.discoverPeers();
            }
        }, 30 * 1000);
    }

    private startCleanupJob(): void {
        setInterval(async () => {
            console.log('GunRepository: Running cleanup job for tombstones');
            const annotationNodes = this.gun.get('annotations');
            annotationNodes.map().once(async (data: any, url: string) => {
                if (!url) return;
                const annotations = annotationNodes.get(url);
                annotations.map().once((annotation: any, id: string) => {
                    if (annotation === null && !annotation?.isDeleted) {
                        console.log(`GunRepository: Cleaning up tombstone without deletion flag for URL: ${url}, ID: ${id}`);
                        annotations.get(id).put(null);
                    }
                });
            });
        }, 60 * 60 * 1000);
    }

    private discoverPeers(): void {
        this.fetchKnownPeers().then((peers) => {
            const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...peers, ...this.initialPeers])];
            if (this.arraysEqual(updatedPeers, this.currentPeers)) {
                console.log('GunRepository: Initial peer list unchanged:', this.currentPeers);
                return;
            }
            this.currentPeers = updatedPeers;
            console.log('GunRepository: Discovered initial peers:', this.currentPeers);
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
                    console.log('GunRepository: Ignoring null or invalid peer entry:', id);
                }
                return;
            }

            const age = now - peer.timestamp;
            if (age > 10 * 60 * 1000) {
                console.log('GunRepository: Removing expired peer:', peer.url);
                this.gun.get('knownPeers').get(id).put(null);
                return;
            }

            this.fetchKnownPeers().then((peers) => {
                const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...peers, ...this.initialPeers])];
                if (this.arraysEqual(updatedPeers, this.currentPeers)) {
                    if (this.throttleLog('Peer list unchanged after update')) {
                        console.log('GunRepository: Peer list unchanged after update:', this.currentPeers);
                    }
                    return;
                }
                this.currentPeers = updatedPeers;
                console.log('GunRepository: Updated peers list:', this.currentPeers);
                this.gun.opt({ peers: this.currentPeers });
                lastUpdateTime = now;
            });
        });
    }

    private async fetchKnownPeers(): Promise<string[]> {
        if (this.fetchAttempts >= this.maxFetchAttempts) {
            console.warn('GunRepository: Max fetch attempts reached, stopping retries');
            return [];
        }

        if (!this.isConnected) {
            console.log('GunRepository: Waiting for connection before fetching knownPeers...');
            await new Promise((resolve) => {
                this.gun.on('hi', () => resolve(null));
                setTimeout(() => {
                    console.warn('GunRepository: Connection timeout in fetchKnownPeers, proceeding');
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
                    console.log('GunRepository: Raw peer data from knownPeers:', id, peer);
                    if (!peer || !peer.url || !peer.timestamp) {
                        return;
                    }
                    const now = Date.now();
                    const age = now - peer.timestamp;
                    if (age <= 10 * 60 * 1000) {
                        peerList.push(peer.url);
                        console.log('GunRepository: Found valid peer:', peer.url, 'Age:', age / 1000, 'seconds');
                    } else {
                        console.log('GunRepository: Skipping stale peer in fetch:', peer.url, 'Age:', age / 1000, 'seconds');
                    }
                });
                setTimeout(() => resolve(peerList), 5000);
            });

            if (peers.length > 0) {
                this.fetchAttempts = 0;
                return peers;
            }

            if (attempt === maxRetries) {
                console.log('GunRepository: No valid peers found in knownPeers after', attempt, 'attempts');
                return [];
            }

            if (this.throttleLog('Retry fetchKnownPeers')) {
                console.log('GunRepository: Retrying fetchKnownPeers, attempt:', attempt);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        console.log('GunRepository: No valid peers found in knownPeers after all retries');
        return [];
    }

    private arraysEqual(arr1: string[] | undefined, arr2: string[] | undefined): boolean {
        if (arr1 === undefined && arr2 === undefined) return true;
        if (arr1 === undefined || arr2 === undefined) return false;
        if (arr1.length !== arr2.length) return false;
        return arr1.every((value, index) => value === arr2[index]);
    }

    getGunInstance(): any {
        return this.gun;
    }

    addPeers(newPeers: string[]): void {
        const updatedPeers = [...new Set([...(this.currentPeers ?? []), ...newPeers, ...this.initialPeers])];
        if (this.arraysEqual(updatedPeers, this.currentPeers)) {
            console.log('GunRepository: No new peers to add:', this.currentPeers);
            return;
        }
        this.currentPeers = updatedPeers;
        this.gun.opt({ peers: this.currentPeers });
        console.log('Updated peers:', this.currentPeers);
    }

    async getCurrentDID(): Promise<string | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get(['currentDID'], (result) => {
                const cachedDID = result.currentDID || null;
                console.log('GunRepository: Retrieved cached DID from chrome.storage.local:', cachedDID);
                if (cachedDID) {
                    this.gun.get(`user_${cachedDID}`).get('did').once((data: any) => {
                        if (data && data.did === cachedDID) {
                            console.log('GunRepository: Confirmed DID in user-specific namespace:', cachedDID);
                            resolve(cachedDID);
                        } else {
                            console.warn('GunRepository: DID not found in user-specific namespace, but retaining in chrome.storage.local');
                            resolve(cachedDID);
                        }
                    });

                    setTimeout(() => {
                        console.warn('GunRepository: Gun.js did not respond, using cached DID as fallback');
                        resolve(cachedDID);
                    }, 5000);
                } else {
                    resolve(null);
                }
            });
        });
    }

    async setCurrentDID(did: string): Promise<void> {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ currentDID: did }, () => {
                console.log('GunRepository: Set current DID in chrome.storage.local:', did);

                this.gun.get(`user_${did}`).get('did').put({ did }, (ack: any) => {
                    if (ack.err) {
                        console.error('GunRepository: Failed to set user-specific DID:', ack.err);
                        reject(new Error(ack.err));
                    } else {
                        console.log('GunRepository: Set user-specific DID in Gun.js:', did);
                        resolve();
                    }
                });
            });
        });
    }

    async clearCurrentDID(): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.remove('currentDID', () => {
                console.log('GunRepository: Cleared current DID from chrome.storage.local');
                resolve();
            });
        });
    }

    async saveProfile(profile: Profile): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get(`user_${profile.did}`).get('profile').put(profile, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to save profile:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Saved profile:', profile);
                    resolve();
                }
            });
        });
    }

    async getProfile(did: string, retries = 5, delay = 1000): Promise<Profile | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const result = await new Promise<Profile | null>((resolve) => {
                this.gun.get(`user_${did}`).get('profile').once((data: any) => {
                    if (data && data.did && data.handle) {
                        console.log('GunRepository: Loaded profile for DID:', did, data);
                        resolve({ did: data.did, handle: data.handle, profilePicture: data.profilePicture });
                    } else {
                        console.warn('GunRepository: Profile not found for DID on attempt', attempt, did, data);
                        resolve(null);
                    }
                });
            });

            if (result) {
                return result;
            }

            console.log(`GunRepository: Retrying getProfile for DID: ${did}, attempt ${attempt}/${retries}`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.error('GunRepository: Failed to load profile for DID after retries:', did);
        return null;
    }

    async getAnnotations(url: string, callback?: AnnotationUpdateCallback): Promise<Annotation[]> {
        const annotations: Annotation[] = [];
        const annotationNode = this.gun.get('annotations').get(url);

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const loadedAnnotations: Set<string> = new Set();
            let hasNewData = false;

            await new Promise<void>((resolve) => {
                const onData = async (annotation: any) => {
                    if (!annotation) return;
                    if (loadedAnnotations.has(annotation.id)) return;
                    loadedAnnotations.add(annotation.id);
                    hasNewData = true;

                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                            if (comment) {
                                commentList.push({
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp,
                                } as Comment);
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 500);
                    });

                    const annotationData: Annotation = {
                        id: annotation.id,
                        url: annotation.url || url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        comments,
                        isDeleted: annotation.isDeleted || false,
                    } as Annotation;

                    annotations.push(annotationData);
                    console.log('GunRepository: Loaded annotation:', annotationData);
                };

                annotationNode.map().once(onData);

                setTimeout(() => {
                    console.log('GunRepository: Initial annotations loaded for URL:', url, annotations, 'Has new data:', hasNewData, 'Attempt:', attempt);
                    resolve();
                }, 2000);
            });

            if (hasNewData || attempt === maxRetries) {
                break;
            }

            console.log('GunRepository: Retrying annotations fetch for URL:', url, 'Attempt:', attempt);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (callback) {
            if (!this.annotationCallbacks.has(url)) {
                this.annotationCallbacks.set(url, { callbacks: [] });
            }
            const entry = this.annotationCallbacks.get(url)!;
            entry.callbacks.push(callback);

            const onUpdate = async (annotation: any, key: string) => {
                console.log('Real-time update received for URL:', url, 'Annotation:', annotation);

                if (annotation === null) {
                    console.log(`Received null annotation for URL: ${url}, verifying deletion intent`);

                    const hasDeletionFlag = annotations.some(ann => ann.id === key && ann.isDeleted === true);

                    if (!hasDeletionFlag) {
                        console.log(`No deletion flag found for URL: ${url}, ignoring null update`);
                        console.log(`Possible unintended null update for URL: ${url}, investigating further`);
                        return;
                    }

                    console.log(`Confirmed deletion for URL: ${url}, ID: ${key}`);
                    const updatedAnnotations = annotations.filter(a => a.id !== key);
                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                    console.log('GunRepository: Real-time deletion for URL:', url, annotations);

                    const entry = this.annotationCallbacks.get(url);
                    if (entry) {
                        entry.callbacks.forEach(cb => cb([...annotations]));
                    }
                } else {
                    console.log(`Processing update for URL: ${url} with annotation:`, annotation);
                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                            if (comment) {
                                commentList.push({
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp,
                                } as Comment);
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 500);
                    });

                    const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                    updatedAnnotations.push({
                        id: annotation.id,
                        url: annotation.url || url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        comments,
                        isDeleted: annotation.isDeleted || false,
                    } as Annotation);

                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                    console.log('GunRepository: Real-time update for URL:', url, annotations);

                    const entry = this.annotationCallbacks.get(url);
                    if (entry) {
                        entry.callbacks.forEach(cb => cb([...annotations]));
                    }
                }
            };

            annotationNode.map().on(onUpdate);

            entry.cleanup = () => {
                annotationNode.map().off();
            };
        }

        return [...annotations];
    }

    cleanupAnnotationsListeners(url: string): void {
        const entry = this.annotationCallbacks.get(url);
        if (entry && entry.cleanup) {
            entry.cleanup();
            this.annotationCallbacks.delete(url);
            console.log('GunRepository: Cleaned up listeners for URL:', url);
        }
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        const { comments, ...annotationWithoutComments } = annotation;

        await new Promise<void>((resolve, reject) => {
            this.gun.get('annotations').get(annotation.url).get(annotation.id).put(annotationWithoutComments, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to save annotation:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Saved annotation:', annotationWithoutComments);
                    resolve();
                }
            });
        });

        if (comments && comments.length > 0) {
            for (const comment of comments) {
                await this.saveComment(annotation.url, annotation.id, comment);
            }
        }
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get('annotations').get(url).get(id).put({ isDeleted: true }, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to mark annotation as deleted:', ack.err);
                    reject(new Error(ack.err));
                    return;
                }

                this.gun.get('annotations').get(url).get(id).put(null, (ack: any) => {
                    if (ack.err) {
                        console.error('GunRepository: Failed to delete annotation:', ack.err);
                        reject(new Error(ack.err));
                    } else {
                        console.log('GunRepository: Deleted annotation:', id);
                        resolve();
                    }
                });
            });
        });
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get('annotations').get(url).get(annotationId).get('comments').get(comment.id).put(comment, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to save comment:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Saved comment:', comment);
                    resolve();
                }
            });
        });
    }
}