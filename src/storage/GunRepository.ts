import Gun from 'gun';
import 'gun/lib/webrtc';
import { Annotation, Comment } from '../shared/types/annotation';
import { Profile } from '../shared/types/userProfile';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface GunRepositoryOptions {
    peers?: string[];
    radisk?: boolean;
}

interface KnownPeer {
    url: string;
    timestamp: number;
}

export class GunRepository {
    private gun: any;
    private options: GunRepositoryOptions;
    private annotationCallbacks: Map<string, AnnotationUpdateCallback[]> = new Map();

    constructor(options: GunRepositoryOptions = {}) {
        // Start with an initial list of peers (can be empty)
        this.options = {
            peers: options.peers || [],
            radisk: options.radisk ?? true,
        };
        this.gun = Gun({
            peers: this.options.peers,
            radisk: this.options.radisk,
            localStorage: false,
            file: 'gun-data',
            webrtc: true,
        });

        // Dynamically discover peers from the knownPeers node
        this.discoverPeers();
    }

    async initialize(): Promise<void> {
        console.log('GunRepository: Initializing...');
        return new Promise((resolve) => {
            this.gun.on('hi', (peer: any) => {
                console.log('GunRepository: Connected to peer:', peer);
                resolve();
            });
        });
    }

    // Fetch and update the list of known peers
    private discoverPeers(): void {
        // Initial fetch of known peers
        this.fetchKnownPeers().then((peers) => {
            if (peers.length > 0) {
                console.log('GunRepository: Discovered initial peers:', peers);
                this.gun.opt({ peers }); // Update the Gun instance's peers list
            }
        });

        // Listen for real-time updates to the knownPeers node
        this.gun.get('knownPeers').map().on((peer: KnownPeer, id: string) => {
            if (peer && peer.url && peer.timestamp) {
                // Check if the peer is still alive (e.g., timestamp within the last 10 minutes)
                const now = Date.now();
                const age = now - peer.timestamp;
                if (age > 10 * 60 * 1000) { // 10 minutes
                    console.log('GunRepository: Removing expired peer:', peer.url);
                    this.gun.get('knownPeers').get(id).put(null); // Remove expired peer
                    return;
                }

                // Fetch the current list of peers and update
                this.fetchKnownPeers().then((peers) => {
                    console.log('GunRepository: Updated peers list:', peers);
                    this.gun.opt({ peers });
                });
            } else {
                // Peer was removed
                this.fetchKnownPeers().then((peers) => {
                    console.log('GunRepository: Updated peers list after removal:', peers);
                    this.gun.opt({ peers });
                });
            }
        });
    }

    // Fetch the current list of known peers
    private async fetchKnownPeers(): Promise<string[]> {
        return new Promise((resolve) => {
            const peers: string[] = [];
            this.gun.get('knownPeers').map().once((peer: KnownPeer) => {
                if (peer && peer.url && peer.timestamp) {
                    // Only include peers that are still alive (timestamp within the last 10 minutes)
                    const now = Date.now();
                    const age = now - peer.timestamp;
                    if (age <= 10 * 60 * 1000) { // 10 minutes
                        peers.push(peer.url);
                    }
                }
            });
            setTimeout(() => resolve(peers), 200);
        });
    }

    async getCurrentDID(): Promise<string | null> {
        return new Promise((resolve) => {
            this.gun.get('currentDID').once((data: any) => {
                resolve(data ? data.did : null);
            });
        });
    }

    async setCurrentDID(did: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get('currentDID').put({ did }, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to set current DID:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Set current DID:', did);
                    resolve();
                }
            });
        });
    }

    async clearCurrentDID(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get('currentDID').put(null, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to clear current DID:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Cleared current DID');
                    resolve();
                }
            });
        });
    }

    async saveProfile(profile: Profile): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gun.get('profiles').get(profile.did).put(profile, (ack: any) => {
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
                this.gun.get('profiles').get(did).once((data: any) => {
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

        await new Promise<void>((resolve) => {
            annotationNode.map().once(async (annotation: any) => {
                if (annotation) {
                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                            if (comment) {
                                commentList.push({
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp,
                                });
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 100);
                    });

                    annotations.push({
                        id: annotation.id,
                        url: annotation.url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        comments,
                    });
                    console.log('GunRepository: Loaded annotation:', { ...annotation, comments });
                }
            });

            setTimeout(() => {
                console.log('GunRepository: Initial annotations loaded for URL:', url, annotations);
                resolve();
            }, 200);
        });

        if (callback) {
            if (!this.annotationCallbacks.has(url)) {
                this.annotationCallbacks.set(url, []);
            }
            this.annotationCallbacks.get(url)!.push(callback);

            annotationNode.map().on(async (annotation: any, key: string) => {
                if (annotation) {
                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                            if (comment) {
                                commentList.push({
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp,
                                });
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 100);
                    });

                    const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                    updatedAnnotations.push({
                        id: annotation.id,
                        url: annotation.url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        comments,
                    });

                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                    console.log('GunRepository: Real-time update for URL:', url, annotations);

                    const callbacks = this.annotationCallbacks.get(url) || [];
                    callbacks.forEach(cb => cb([...annotations]));
                } else {
                    const updatedAnnotations = annotations.filter(a => a.id !== key);
                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                    console.log('GunRepository: Real-time deletion for URL:', url, annotations);

                    const callbacks = this.annotationCallbacks.get(url) || [];
                    callbacks.forEach(cb => cb([...annotations]));
                }
            });
        }

        return [...annotations];
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        const { comments, ...annotationWithoutComments } = annotation;

        await new Promise((resolve, reject) => {
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