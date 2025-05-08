import { Annotation } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { CommentManager } from './CommentManager';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface CallbackEntry {
    callbacks: AnnotationUpdateCallback[];
    cleanup?: () => void;
}

export class AnnotationManager {
    private gun: any;
    private annotationCallbacks: Map<string, CallbackEntry> = new Map();
    private commentManager: CommentManager;

    constructor(gun: any) {
        this.gun = gun;
        this.commentManager = new CommentManager(gun);
    }

    getShardKey(url: string): { domainShard: string; subShard?: string } {
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
        const totalStartTime = Date.now();
        console.log(`[Timing] Starting getAnnotations for URL: ${url} at ${new Date().toISOString()}`);

        const annotations: Annotation[] = [];
        const { domainShard, subShard } = this.getShardKey(url);
        const annotationNodes = [
            this.gun.get(domainShard).get(url), // Primary shard
            ...(subShard ? [this.gun.get(subShard).get(url)] : []), // Sub-shard
        ];

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const attemptStartTime = Date.now();
            const loadedAnnotations: Set<string> = new Set();
            let hasNewData = false;

            for (const annotationNode of annotationNodes) {
                await new Promise<void>((resolve) => {
                    const onData = async (annotation: any, key: string) => {
                        // Skip non-annotation nodes
                        if (!annotation || !annotation.id || !annotation.content || !annotation.author || !annotation.timestamp) {
                            console.log(`Skipped non-annotation node for URL: ${url}, Key: ${key}, Data:`, annotation);
                            return;
                        }
                        if (loadedAnnotations.has(annotation.id)) {
                            console.log(`Skipped duplicate annotation for URL: ${url}, ID: ${annotation.id}`);
                            return;
                        }
                        if (annotation.isDeleted) {
                            console.log(`Skipped deleted annotation for URL: ${url}, ID: ${annotation.id}`);
                            return;
                        }
                        loadedAnnotations.add(annotation.id);
                        hasNewData = true;

                        const comments = await this.commentManager.getComments(url, annotation.id, annotationNode);

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

                    let nodesProcessed = 0;
                    const totalNodes = annotationNodes.length;

                    const timeout = setTimeout(() => {
                        console.log(`Annotation fetch attempt ${attempt}/${maxRetries} for URL: ${url} timed out after 3000ms`);
                        nodesProcessed = totalNodes;
                        console.log('AnnotationManager: Initial annotations loaded for URL:', url, annotations, 'Has new data:', hasNewData, 'Attempt:', attempt);
                        resolve();
                    }, 3000);

                    // If no annotations, resolve immediately
                    setTimeout(() => {
                        if (nodesProcessed === 0) {
                            clearTimeout(timeout);
                            console.log('AnnotationManager: Initial annotations loaded for URL:', url, annotations, 'Has new data:', hasNewData, 'Attempt:', attempt);
                            resolve();
                        }
                    }, 100);
                });
            }

            const attemptEndTime = Date.now();
            console.log(`[Timing] Fetch annotations attempt ${attempt}/${maxRetries} for URL: ${url} took ${attemptEndTime - attemptStartTime}ms`);

            if (hasNewData || attempt === maxRetries) {
                break;
            }

            console.log('AnnotationManager: Retrying annotations fetch for URL:', url, 'Attempt:', attempt);
            await new Promise((resolve) => setTimeout(resolve, 500)); // Reduced retry delay to match server
        }

        const fetchAnnotationsEnd = Date.now();
        console.log(`[Timing] Total fetch annotations time for URL: ${url}: ${fetchAnnotationsEnd - totalStartTime}ms`);

        if (callback) {
            if (!this.annotationCallbacks.has(url)) {
                this.annotationCallbacks.set(url, { callbacks: [] });
            }
            const entry = this.annotationCallbacks.get(url)!;
            entry.callbacks.push(callback);

            const onUpdate = async (annotation: any, key: string) => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] Real-time update received for URL: ${url}, Key: ${key}, Annotation:`, annotation);

                // Skip non-annotation updates
                if (!annotation || !annotation.id || !annotation.content || !annotation.author || !annotation.timestamp) {
                    console.log(`Skipped non-annotation update for URL: ${url}, Key: ${key}, Data:`, annotation);
                    return;
                }

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
                    const comments = await this.commentManager.getComments(url, annotation.id, annotationNodes[0]);

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

            const onCommentUpdate = async (comment: any, commentId: string, _unused: any, node: any) => {
                if (!node || !node._ || !node._.get) {
                    console.warn(`Invalid node context for comment update, URL: ${url}, Comment ID: ${commentId}`);
                    return;
                }

                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] Real-time comment update received for URL: ${url}, Comment ID: ${commentId}, Comment:`, comment);

                // Find the annotation containing this comment
                const annotationId = node._.get('id');
                const annotation = annotations.find(a => a.id === annotationId);
                if (!annotation) {
                    console.log(`[${timestamp}] No matching annotation found for comment update, URL: ${url}, Annotation ID: ${annotationId}`);
                    return;
                }

                // Refetch comments for the affected annotation
                const comments = await this.commentManager.getComments(url, annotationId, annotationNodes[0]);
                const updatedAnnotations = annotations.filter(a => a.id !== annotationId);
                updatedAnnotations.push({
                    ...annotation,
                    comments,
                });

                annotations.splice(0, annotations.length, ...updatedAnnotations);
                entry.callbacks.forEach(cb => cb([...annotations]));
            };

            // Subscribe to annotation updates
            annotationNodes.forEach(node => node.map().on(onUpdate));

            // Subscribe to comment updates for each annotation
            annotationNodes.forEach(node => {
                node.map().get('comments').map().on(onCommentUpdate);
            });

            entry.cleanup = () => {
                annotationNodes.forEach(node => {
                    node.map().off();
                    node.map().get('comments').map().off();
                });
            };
        }

        const totalEndTime = Date.now();
        console.log(`[Timing] Total getAnnotations time for URL: ${url}: ${totalEndTime - totalStartTime}ms`);
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
            targetNode.get(annotation.id).put({ ...annotationWithoutComments, isDeleted: false }, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save annotation:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved annotation:', annotationWithoutComments);
                    resolve();
                }
            });
        });
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
}