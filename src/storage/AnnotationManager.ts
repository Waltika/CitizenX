import { Annotation, Comment } from '@/types';
import { normalizeUrl } from '@/shared/utils/normalizeUrl';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface CallbackEntry {
    callbacks: AnnotationUpdateCallback[];
    cleanup?: () => void;
}

export class AnnotationManager {
    private gun: any;
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
            this.gun.get('annotations').get(url), // Legacy non-sharded node
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
                        annotationNodes[1].get(annotation.id).get('comments').map().once((comment: any) => {
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
                            timestamp: annotation.timestamp,
                            comments,
                            isDeleted: annotation.isDeleted || false,
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
}