import { Comment } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

export class CommentManager {
    private gun: any;

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

    async getComments(url: string, annotationId: string, annotationNode: any): Promise<Comment[]> {
        const startTime = Date.now();
        console.log(`[Timing] Starting getComments for URL: ${url}, Annotation ID: ${annotationId} at ${new Date().toISOString()}`);

        const comments: Comment[] = [];
        await new Promise<void>((resolve) => {
            let nodesProcessed = 0;
            const totalNodes = 1; // Single node for this query

            const timeout = setTimeout(() => {
                console.log(`Fetch comments for annotation ${annotationId} timed out after 1000ms`);
                nodesProcessed = totalNodes;
                resolve();
            }, 1000);

            annotationNode.get(annotationId).get('comments').map().once((comment: any) => {
                if (comment) {
                    if (!('isDeleted' in comment)) {
                        console.warn(`Comment missing isDeleted field for annotation ${annotationId}, Comment ID: ${comment.id}`);
                        comment.isDeleted = false;
                    }
                    if (!comment.isDeleted) {
                        comments.push({
                            id: comment.id,
                            content: comment.content,
                            author: comment.author,
                            timestamp: comment.timestamp,
                        } as Comment);
                    } else {
                        console.log(`Skipped deleted comment for annotation ${annotationId}, Comment ID: ${comment.id}`);
                    }
                } else {
                    console.warn(`Encountered null or undefined comment for annotation ${annotationId}`);
                }
                nodesProcessed++;
                if (nodesProcessed === totalNodes) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            // If no comments, resolve immediately
            setTimeout(() => {
                if (nodesProcessed === 0) {
                    clearTimeout(timeout);
                    resolve();
                }
            }, 100);
        });

        const endTime = Date.now();
        console.log(`[Timing] Total getComments time for URL: ${url}, Annotation ID: ${annotationId}: ${endTime - startTime}ms`);

        return comments.sort((a, b) => a.timestamp - b.timestamp);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            targetNode.get(annotationId).get('comments').get(comment.id).put({ ...comment, isDeleted: false }, (ack: any) => {
                if (ack.err) {
                    console.error('CommentManager: Failed to save comment:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('CommentManager: Saved comment:', comment);
                    resolve();
                }
            });
        });
    }

    async deleteComment(url: string, annotationId: string, commentId: string, requesterDID: string): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Starting comment deletion for URL: ${url}, Annotation ID: ${annotationId}, Comment ID: ${commentId}`);

            // Fetch comment to verify author
            targetNode.get(annotationId).get('comments').get(commentId).once((comment: any) => {
                if (!comment) {
                    console.error(`[${timestamp}] Comment not found for URL: ${url}, Annotation ID: ${annotationId}, Comment ID: ${commentId}`);
                    reject(new Error('Comment not found'));
                    return;
                }

                if (comment.author !== requesterDID) {
                    console.error(`[${timestamp}] Unauthorized deletion attempt for URL: ${url}, Annotation ID: ${annotationId}, Comment ID: ${commentId}, Requester DID: ${requesterDID}`);
                    reject(new Error('Unauthorized: Only the comment author can delete it'));
                    return;
                }

                // Mark comment as deleted
                targetNode.get(annotationId).get('comments').get(commentId).put({ isDeleted: true }, (ack: any) => {
                    const markTimestamp = new Date().toISOString();
                    if (ack.err) {
                        console.error(`[${markTimestamp}] Failed to mark comment as deleted for URL: ${url}, Annotation ID: ${annotationId}, Comment ID: ${commentId}, Error:`, ack.err);
                        reject(new Error(ack.err));
                    } else {
                        console.log(`[${markTimestamp}] Successfully marked comment as deleted for URL: ${url}, Annotation ID: ${annotationId}, Comment ID: ${commentId}`);
                        // Log deletion for transparency
                        this.gun.get('deletionLog').get(`${timestamp}_${commentId}`).put({
                            type: 'comment',
                            url,
                            annotationId,
                            commentId,
                            requesterDID,
                            timestamp,
                        });
                        resolve();
                    }
                });
            });
        });
    }
}