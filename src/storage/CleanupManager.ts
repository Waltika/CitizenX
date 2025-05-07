import {normalizeUrl} from '@/shared/utils/normalizeUrl';
import {Comment} from '@/types';

export class CleanupManager {
    private gun: any;

    constructor(gun: any) {
        this.gun = gun;
    }

    private getShardKey(url: string): { domainShard: string; subShard?: string } {
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace(/\./g, '_');
        const domainShard = `annotations_${domain}`;

        const highTrafficDomains = ['google_com', 'facebook_com', 'twitter_com'];
        if (highTrafficDomains.includes(domain)) {
            const hash = this.simpleHash(normalizedUrl);
            const subShardIndex = hash % 10;
            return {domainShard, subShard: `${domainShard}_shard_${subShardIndex}`};
        }

        return {domainShard};
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    async migrateAnnotations(): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] CleanupManager: Starting annotation migration to sharded nodes`);

        const annotationNodes = this.gun.get('annotations');
        await new Promise<void>((resolve) => {
            annotationNodes.map().once(async (data: any, url: string) => {
                if (!url) return;
                const annotations = annotationNodes.get(url);
                annotations.map().once(async (annotation: any, id: string) => {
                    if (!annotation || annotation.isDeleted) return;

                    const {domainShard, subShard} = this.getShardKey(url);
                    const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

                    const comments = await new Promise<Comment[]>((resolveComments) => {
                        const commentList: Comment[] = [];
                        annotations.get(id).get('comments').map().once((comment: any) => {
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

                    const annotationData = {
                        id: annotation.id,
                        url: annotation.url || url,
                        content: annotation.content,
                        author: annotation.author,
                        timestamp: annotation.timestamp,
                        isDeleted: annotation.isDeleted || false,
                    };

                    await new Promise<void>((resolvePut, rejectPut) => {
                        targetNode.get(id).put(annotationData, (ack: any) => {
                            if (ack.err) {
                                console.error(`[${timestamp}] CleanupManager: Failed to migrate annotation for URL: ${url}, ID: ${id}, Error:`, ack.err);
                                rejectPut(new Error(ack.err));
                            } else {
                                console.log(`[${timestamp}] CleanupManager: Migrated annotation for URL: ${url}, ID: ${id}`);
                                if (comments.length > 0) {
                                    comments.forEach(comment => {
                                        targetNode.get(id).get('comments').get(comment.id).put(comment, (commentAck: any) => {
                                            if (commentAck.err) {
                                                console.error(`[${timestamp}] CleanupManager: Failed to migrate comment for URL: ${url}, Annotation ID: ${id}, Comment ID: ${comment.id}, Error:`, commentAck.err);
                                            }
                                        });
                                    });
                                }
                                resolvePut();
                            }
                        });
                    });
                });
            });
            setTimeout(() => {
                console.log(`[${timestamp}] CleanupManager: Annotation migration completed`);
                resolve();
            }, 10000);
        });
    }

    startCleanupJob(): void {
        setInterval(async () => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] CleanupManager: Running cleanup job for tombstones`);
            const annotationNodes = this.gun.get('annotations');
            annotationNodes.map().once(async (data: any, url: string) => {
                if (!url) return;
                const annotations = annotationNodes.get(url);
                annotations.map().once((annotation: any, id: string) => {
                    const logTimestamp = new Date().toISOString();
                    if (annotation === null) {
                        console.log(`[${logTimestamp}] CleanupManager: Found tombstone for URL: ${url}, ID: ${id}`);
                    } else if (annotation?.isDeleted) {
                        console.log(`[${logTimestamp}] CleanupManager: Found marked-for-deletion annotation for URL: ${url}, ID: ${id}, ensuring tombstone`);
                        annotations.get(id).put(null, (ack: any) => {
                            if (ack.err) {
                                console.error(`[${logTimestamp}] CleanupManager: Failed to tombstone marked-for-deletion annotation for URL: ${url}, ID: ${id}, Error:`, ack.err);
                            } else {
                                console.log(`[${logTimestamp}] CleanupManager: Successfully tombstoned marked-for-deletion annotation for URL: ${url}, ID: ${id}`);
                            }
                        });
                    }
                });
            });
        }, 60 * 60 * 1000); // Run every hour
    }

    async inspectAnnotations(): Promise<void> {
        console.log('CleanupManager: Inspecting all annotations...');
        const annotationNodes = this.gun.get('annotations');
        annotationNodes.map().once(async (data: any, url: string) => {
            if (!url) return;
            console.log(`Inspecting annotations for URL: ${url}`);
            const annotations = annotationNodes.get(url);
            annotations.map().once((annotation: any, id: string) => {
                const timestamp = new Date().toISOString();
                if (annotation === null) {
                    console.log(`[${timestamp}] CleanupManager: Found tombstone for URL: ${url}, ID: ${id}`);
                } else if (annotation?.isDeleted) {
                    console.log(`[${timestamp}] CleanupManager: Found marked-for-deletion annotation for URL: ${url}, ID: ${id}, Data:`, annotation);
                } else {
                    console.log(`[${timestamp}] CleanupManager: Found active annotation for URL: ${url}, ID: ${id}, Data:`, annotation);
                }
            });
        });
    }
}