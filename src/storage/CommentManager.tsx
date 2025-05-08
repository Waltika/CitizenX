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
        const comments: Comment[] = [];
        await new Promise<void>((resolve) => {
            annotationNode.get(annotationId).get('comments').map().once((comment: any) => {
                if (comment) {
                    comments.push({
                        id: comment.id,
                        content: comment.content,
                        author: comment.author,
                        timestamp: comment.timestamp,
                    } as Comment);
                }
            });
            setTimeout(() => resolve(), 500);
        });
        return comments.sort((a, b) => a.timestamp - b.timestamp);
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            targetNode.get(annotationId).get('comments').get(comment.id).put(comment, (ack: any) => {
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
}