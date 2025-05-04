import Gun from 'gun';
import 'gun/lib/webrtc.js';
import {AnnotationType, CommentType, ProfileType} from '../types/index.js';

type AnnotationUpdateCallback = (annotations: AnnotationType[]) => void;

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
        this.options = {
            peers: options.peers || ['https://citizen-x-bootsrap.onrender.com/gun'], // Updated to use the Render server
            radisk: options.radisk ?? true,
        };
        this.gun = Gun({
            peers: this.options.peers,
            radisk: this.options.radisk,
            localStorage: false,
            file: 'gun-data',
            webrtc: true,
        });

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

    private discoverPeers(): void {
        this.fetchKnownPeers().then((peers) => {
            if (peers.length > 0) {
                console.log('GunRepository: Discovered initial peers:', peers);
                this.gun.opt({peers});
            }
        });

        this.gun.get('knownPeers').map().on((peer: KnownPeer, id: string) => {
            if (peer && peer.url && peer.timestamp) {
                const now = Date.now();
                const age = now - peer.timestamp;
                if (age > 10 * 60 * 1000) {
                    console.log('GunRepository: Removing expired peer:', peer.url);
                    this.gun.get('knownPeers').get(id).put(null);
                    return;
                }

                this.fetchKnownPeers().then((peers) => {
                    console.log('GunRepository: Updated peers list:', peers);
                    this.gun.opt({peers});
                });
            } else {
                this.fetchKnownPeers().then((peers) => {
                    console.log('GunRepository: Updated peers list after removal:', peers);
                    this.gun.opt({peers});
                });
            }
        });
    }

    private async fetchKnownPeers(): Promise<string[]> {
        return new Promise((resolve) => {
            const peers: string[] = [];
            this.gun.get('knownPeers').map().once((peer: KnownPeer) => {
                if (peer && peer.url && peer.timestamp) {
                    const now = Date.now();
                    const age = now - peer.timestamp;
                    if (age <= 10 * 60 * 1000) {
                        peers.push(peer.url);
                    }
                }
            });
            setTimeout(() => resolve(peers), 200);
        });
    }

    getGunInstance(): any {
        return this.gun;
    }

    addPeers(newPeers: string[]): void {
        const currentPeers = this.options.peers || [];
        const updatedPeers = [...new Set([...currentPeers, ...newPeers])];
        this.options.peers = updatedPeers;
        this.gun.opt({peers: updatedPeers});
        console.log('Updated peers:', updatedPeers);
    }

    async getCurrentDID(): Promise<string | null> {
        return new Promise((resolve) => {
            // First, check localStorage for the cached DID
            const cachedDID = localStorage.getItem('currentDID');
            console.log('GunRepository: Retrieved cached DID from localStorage:', cachedDID);
            if (cachedDID) {
                // Verify the DID exists in Gun.js (e.g., user-specific namespace)
                this.gun.get(`user_${cachedDID}`).get('did').once((data: any) => {
                    if (data && data.did === cachedDID) {
                        console.log('GunRepository: Confirmed DID in user-specific namespace:', cachedDID);
                        resolve(cachedDID);
                    } else {
                        console.log('GunRepository: DID not found in user-specific namespace, clearing localStorage');
                        localStorage.removeItem('currentDID');
                        resolve(null);
                    }
                });
            } else {
                resolve(null);
            }
        });
    }

    async setCurrentDID(did: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Cache the DID in localStorage
            localStorage.setItem('currentDID', did);
            console.log('GunRepository: Set current DID in localStorage:', did);

            // Store the DID in a user-specific namespace in Gun.js
            this.gun.get(`user_${did}`).get('did').put({did}, (ack: any) => {
                if (ack.err) {
                    console.error('GunRepository: Failed to set user-specific DID:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('GunRepository: Set user-specific DID in Gun.js:', did);
                    resolve();
                }
            });
        });
    }

    async clearCurrentDID(): Promise<void> {
        return new Promise((resolve) => {
            // Clear the DID from localStorage
            localStorage.removeItem('currentDID');
            console.log('GunRepository: Cleared current DID from localStorage');

            // No need to clear the user-specific namespace in Gun.js, as it should persist
            resolve();
        });
    }

    async saveProfile(profile: ProfileType): Promise<void> {
        return new Promise((resolve, reject) => {
            // Store the profile in the user-specific namespace
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

    async getProfile(did: string, retries = 5, delay = 1000): Promise<ProfileType | null> {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const result = await new Promise<ProfileType | null>((resolve) => {
                this.gun.get(`user_${did}`).get('profile').once((data: any) => {
                    if (data && data.did && data.handle) {
                        console.log('GunRepository: Loaded profile for DID:', did, data);
                        resolve({did: data.did, handle: data.handle, profilePicture: data.profilePicture});
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

    async getAnnotations(url: string, callback?: AnnotationUpdateCallback): Promise<AnnotationType[]> {
        const annotations: AnnotationType[] = [];
        const annotationNode = this.gun.get('annotations').get(url);

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const loadedAnnotations: Set<string> = new Set();
            let hasNewData = false;

            await new Promise<void>((resolve) => {
                annotationNode.map().once(async (annotation: any) => {
                    if (annotation && !loadedAnnotations.has(annotation.id)) {
                        loadedAnnotations.add(annotation.id);
                        hasNewData = true;

                        const comments: CommentType[] = await new Promise((resolveComments) => {
                            const commentList: CommentType[] = [];
                            annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                                if (comment) {
                                    commentList.push({
                                        id: comment.id,
                                        content: comment.content,
                                        author: comment.author,
                                        timestamp: comment.timestamp,
                                        authorHandle: comment.authorHandle
                                    });
                                }
                            });
                            setTimeout(() => resolveComments(commentList), 500);
                        });

                        const annotationData: AnnotationType = {
                            id: annotation.id,
                            url: annotation.url,
                            content: annotation.content,
                            author: annotation.author,
                            timestamp: annotation.timestamp,
                            comments: annotation.comments,
                            authorHandle: annotation.authorHandle,
                            authorProfilePicture: annotation.authorProfilePicture,
                        };
                        annotations.push(annotationData);
                        console.log('GunRepository: Loaded annotation:', annotationData);
                    }
                });

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
                this.annotationCallbacks.set(url, []);
            }
            this.annotationCallbacks.get(url)!.push(callback);

            annotationNode.map().on(async (annotation: any, key: string) => {
                console.log('Real-time update received for URL:', url, 'Annotation:', annotation);
                if (annotation) {
                    const comments: CommentType[] = await new Promise((resolveComments) => {
                        const commentList: CommentType[] = [];
                        annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                            if (comment) {
                                commentList.push({
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp,
                                    authorHandle: comment.authorHandle
                                });
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 500);
                    });

                    const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                    updatedAnnotations.push({
                        id: annotation.id,
                        url: annotation.url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        comments: annotation.comments,
                        authorHandle: annotation.authorHandle,
                        authorProfilePicture: annotation.authorProfilePicture,
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

// saveAnnotation
    async saveAnnotation(annotation: AnnotationType): Promise<void> {
        const {comments, ...annotationWithoutComments} = annotation;

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

// saveComment
    async saveComment(url: string, annotationId: string, comment: CommentType): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const commentData = {
                id: comment.id,
                content: comment.content,
                author: comment.author,
                timestamp: comment.timestamp,
                authorHandle: comment.authorHandle
            };
            this.gun.get('annotations').get(url).get(annotationId).get('comments').get(comment.id).put(commentData, (ack: any) => {
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