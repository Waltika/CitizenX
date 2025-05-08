import { Annotation, Comment } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface CallbackEntry {
    callbacks: AnnotationUpdateCallback[];
    cleanup?: () => void;
}

export class AnnotationManager {
    private gun: any;
    private serverUrl: string = 'https://citizen-x-bootsrap.onrender.com';
    private annotationCallbacks: Map<string, CallbackEntry> = new Map();

    constructor(gun: any) {
        this.gun = gun;
    }

    private getShardKey(url: string): { domainShard: string; subShard?: string } {
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace(/\./g, '_');
        const domainShard = `annotations_${domain}`;

        // Sub-sharding for high-traffic domains
        const highTrafficDomains = ['google_com', 'facebook_com', 'twitter_com'];
        if (highTrafficDomains.includes(domain)) {
            const hash = this.simpleHash(normalizedUrl);
            const subShardIndex = hash % 10; // 10 sub-shards
            return { domainShard, subShard: `${domainShard}_shard_${subShardIndex}` };
        }

        return { domainShard };
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    async getAnnotations(url: string, callback?: AnnotationUpdateCallback): Promise<Annotation[]> {
        const annotations: Annotation[] = [];
        const { domainShard, subShard } = this.getShardKey(url);
        const annotationNodes = [
            this.gun.get(domainShard).get(url), // Primary shard
        ];
        if (subShard) {
            annotationNodes.push(this.gun.get(subShard).get(url)); // Sub-shard for high-traffic domains
        }

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const loadedAnnotations: Set<string> = new Set();
            let hasNewData = false;

            for (const annotationNode of annotationNodes) {
                await new Promise<void>((resolve) => {
                    const onData = async (annotation: any) => {
                        if (!annotation) return;
                        if (loadedAnnotations.has(annotation.id)) return;
                        loadedAnnotations.add(annotation.id);
                        hasNewData = true;

                        const comments: Comment[] = await new Promise((resolveComments) => {
                            const commentList: Comment[] = [];
                            const commentIds: Set<string> = new Set();
                            annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                                if (
                                    comment &&
                                    comment.id &&
                                    comment.author &&
                                    typeof comment.author === 'string' &&
                                    comment.author.startsWith('did:') &&
                                    comment.content &&
                                    !commentIds.has(comment.id)
                                ) {
                                    commentIds.add(comment.id);
                                    const commentData: Comment = {
                                        id: comment.id,
                                        content: comment.content,
                                        author: comment.author,
                                        timestamp: comment.timestamp || Date.now(),
                                        isDeleted: comment.isDeleted || false,
                                        annotationId: comment.annotationId || annotation.id
                                    };
                                    if (!commentData.isDeleted) {
                                        commentList.push(commentData);
                                    }
                                } else {
                                    console.warn('AnnotationManager: Skipping invalid comment:', comment);
                                }
                            });
                            setTimeout(() => resolveComments(commentList), 500);
                        });

                        // Consistency check for comments
                        const commentStates = await Promise.all(
                            annotationNodes.map((node) =>
                                new Promise<Record<string, boolean>>((resolve) => {
                                    const states: Record<string, boolean> = {};
                                    node.get(annotation.id).get('comments').map().once((comment: any, commentId: string) => {
                                        if (comment) {
                                            states[commentId] = comment.isDeleted || false;
                                        }
                                    });
                                    setTimeout(() => resolve(states), 500);
                                })
                            )
                        );

                        // Resolve inconsistencies in comment states
                        const resolvedComments: Comment[] = [];
                        const seenCommentIds: Set<string> = new Set();
                        for (const comment of comments) {
                            if (seenCommentIds.has(comment.id)) continue;
                            seenCommentIds.add(comment.id);

                            let isDeleted = false;
                            for (const states of commentStates) {
                                if (states[comment.id] === true) {
                                    isDeleted = true;
                                    break;
                                }
                            }
                            if (!isDeleted) {
                                resolvedComments.push(comment);
                            } else {
                                console.log(`AnnotationManager: Excluded inconsistent deleted comment for annotation ${annotation.id}, Comment ID: ${comment.id}`);
                            }
                        }

                        const annotationData: Annotation = {
                            id: annotation.id,
                            url: annotation.url || url,
                            content: annotation.content,
                            author: annotation.author,
                            timestamp: annotation.timestamp || Date.now(),
                            comments: resolvedComments,
                            isDeleted: annotation.isDeleted || false,
                            text: annotation.text || '',
                        } as Annotation;

                        annotations.push(annotationData);
                        console.log('AnnotationManager: Loaded annotation:', annotationData);
                    };

                    annotationNode.map().once(onData);

                    setTimeout(() => {
                        console.log('AnnotationManager: Initial annotations loaded for URL:', url, annotations, 'Has new data:', hasNewData, 'Attempt:', attempt);
                        resolve();
                    }, 2000);
                });
            }

            if (hasNewData || attempt === maxRetries) {
                break;
            }

            console.log('AnnotationManager: Retrying annotations fetch for URL:', url, 'Attempt:', attempt);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (callback) {
            if (!this.annotationCallbacks.has(url)) {
                this.annotationCallbacks.set(url, { callbacks: [] });
            }
            const entry = this.annotationCallbacks.get(url)!;
            entry.callbacks.push(callback);

            const onUpdate = async (annotation: any, key: string) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] Real-time update received for URL: ${url}, Key: ${key}, Annotation:`, annotation);

                if (annotation === null) {
                    console.log(`[${timestamp}] Received null annotation for URL: ${url}, Key: ${key}, verifying deletion intent`);
                    const matchingAnnotation = annotations.find(ann => ann.id === key);
                    const hasDeletionFlag = matchingAnnotation?.isDeleted === true;

                    console.log(`[${timestamp}] Deletion flag check for URL: ${url}, Key: ${key} - Has deletion flag: ${hasDeletionFlag}, Matching annotation:`, matchingAnnotation);

                    if (!hasDeletionFlag) {
                        console.log(`[${timestamp}] No deletion flag found for URL: ${url}, Key: ${key}, ignoring null update`);
                        return;
                    }

                    console.log(`[${timestamp}] Confirmed deletion for URL: ${url}, ID: ${key}`);
                    const updatedAnnotations = annotations.filter(a => a.id !== key);
                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                } else {
                    console.log(`[${timestamp}] Processing update for URL: ${url} with annotation:`, annotation);
                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        const commentIds: Set<string> = new Set();
                        annotationNodes[0].get(annotation.id).get('comments').map().once((comment: any) => {
                            if (
                                comment &&
                                comment.id &&
                                comment.author &&
                                typeof comment.author === 'string' &&
                                comment.author.startsWith('did:') &&
                                comment.content &&
                                !commentIds.has(comment.id)
                            ) {
                                commentIds.add(comment.id);
                                const commentData: Comment = {
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp || Date.now(),
                                    isDeleted: comment.isDeleted || false,
                                    annotationId: ''
                                };
                                if (!commentData.isDeleted) {
                                    commentList.push(commentData);
                                }
                            } else {
                                console.warn('AnnotationManager: Skipping invalid comment during update:', comment);
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 500);
                    });

                    // Consistency check for comments during update
                    const commentStates = await Promise.all(
                        annotationNodes.map((node) =>
                            new Promise<Record<string, boolean>>((resolve) => {
                                const states: Record<string, boolean> = {};
                                node.get(annotation.id).get('comments').map().once((comment: any, commentId: string) => {
                                    if (comment) {
                                        states[commentId] = comment.isDeleted || false;
                                    }
                                });
                                setTimeout(() => resolve(states), 500);
                            })
                        )
                    );

                    // Resolve inconsistencies in comment states
                    const resolvedComments: Comment[] = [];
                    const seenCommentIds: Set<string> = new Set();
                    for (const comment of comments) {
                        if (seenCommentIds.has(comment.id)) continue;
                        seenCommentIds.add(comment.id);

                        let isDeleted = false;
                        for (const states of commentStates) {
                            if (states[comment.id] === true) {
                                isDeleted = true;
                                break;
                            }
                        }
                        if (!isDeleted) {
                            resolvedComments.push(comment);
                        } else {
                            console.log(`AnnotationManager: Excluded inconsistent deleted comment during update for annotation ${annotation.id}, Comment ID: ${comment.id}`);
                        }
                    }

                    if (annotation.isDeleted) {
                        console.log(`[${timestamp}] Skipping update for deleted annotation for URL: ${url}, ID: ${annotation.id}`);
                        const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                        annotations.splice(0, annotations.length, ...updatedAnnotations);
                    } else {
                        const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                        updatedAnnotations.push({
                            id: annotation.id,
                            url: annotation.url || url,
                            content: annotation.content,
                            author: annotation.author,
                            timestamp: annotation.timestamp || Date.now(),
                            comments: resolvedComments,
                            isDeleted: annotation.isDeleted || false,
                            text: annotation.text || '',
                        } as Annotation);

                        annotations.splice(0, annotations.length, ...updatedAnnotations);
                    }
                }

                entry.callbacks.forEach(cb => cb([...annotations]));
            };

            annotationNodes.forEach(node => node.map().on(onUpdate));

            entry.cleanup = () => {
                annotationNodes.forEach(node => node.map().off());
            };
        }

        return [...annotations];
    }

    cleanupAnnotationsListeners(url: string): void {
        const entry = this.annotationCallbacks.get(url);
        if (entry && entry.cleanup) {
            entry.cleanup();
            this.annotationCallbacks.delete(url);
            console.log('AnnotationManager: Cleaned up listeners for URL:', url);
        }
    }

    async saveAnnotation(annotation: Annotation): Promise<void> {
        const { comments, ...annotationWithoutComments } = annotation;
        const { domainShard, subShard } = this.getShardKey(annotation.url);
        const targetNode = subShard ? this.gun.get(subShard).get(annotation.url) : this.gun.get(domainShard).get(annotation.url);

        await new Promise<void>((resolve, reject) => {
            targetNode.get(annotation.id).put(annotationWithoutComments, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save annotation:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved annotation:', annotationWithoutComments);
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
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Starting deletion for URL: ${url}, ID: ${id}`);

            targetNode.get(id).put({ isDeleted: true }, (ack: any) => {
                const markTimestamp = new Date().toISOString();
                if (ack.err) {
                    console.error(`[${markTimestamp}] Failed to mark annotation as deleted for URL: ${url}, ID: ${id}, Error:`, ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log(`[${markTimestamp}] Successfully marked annotation as deleted for URL: ${url}, ID: ${id}`);
                    resolve();
                }
            });
        });
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            targetNode.get(annotationId).get('comments').get(comment.id).put(comment, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save comment:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved comment:', comment);
                    resolve();
                }
            });
        });
    }

    async deleteComment(url: string, annotationId: string, commentId: string, userDid: string): Promise<void> {
        const response = await fetch(`${this.serverUrl}/api/comments`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-DID': userDid,
            },
            body: JSON.stringify({ url, annotationId, commentId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to delete comment');
        }
    }
}