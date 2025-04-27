import Gun from 'gun';
import { Annotation, Comment, Profile } from '../types';

interface GunRepositoryOptions {
    peers?: string[];
    radisk?: boolean;
}

export class GunRepository {
    private gun: any;
    private options: GunRepositoryOptions;

    constructor(options: GunRepositoryOptions = {}) {
        this.options = {
            peers: options.peers || ['http://localhost:8765/gun'],
            radisk: options.radisk ?? false,
        };
        this.gun = Gun({
            peers: this.options.peers,
            radisk: this.options.radisk,
            localStorage: false,
        });
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

    async getAnnotations(url: string): Promise<Annotation[]> {
        return new Promise((resolve) => {
            const annotations: Annotation[] = [];
            const annotationNode = this.gun.get('annotations').get(url);

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
                console.log('GunRepository: All annotations loaded for URL:', url, annotations);
                resolve(annotations);
            }, 200);
        });
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