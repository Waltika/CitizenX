import Gun from 'gun';
import { normalizeUrl } from '../utils/normalizeUrl';
import { AnnotationType, CommentType } from '../types/index.js';

interface GetAnnotationsServerProps {
    gun: any;
    url: string;
    normalizeUrl: (url: string) => string;
}

export async function getAnnotationsServer({ gun, url, normalizeUrl }: GetAnnotationsServerProps): Promise<AnnotationType[]> {
    const normalizedUrl = normalizeUrl(url);
    const annotations: AnnotationType[] = [];

    await new Promise<void>((resolve) => {
        gun.get('annotations').get(normalizedUrl).map().once((annotation: {
            id: string;
            url: string;
            content: string;
            author: string;
            timestamp: number;
            authorHandle?: string;
            authorProfilePicture?: string;
        }) => {
            if (annotation) {
                const comments: CommentType[] = [];
                gun.get('annotations').get(normalizedUrl).get(annotation.id).get('comments').map().once((comment: {
                    id: string;
                    content: string;
                    author: string;
                    timestamp: number;
                    authorHandle?: string;
                }) => {
                    if (comment) {
                        comments.push({
                            id: comment.id,
                            content: comment.content,
                            author: comment.author,
                            timestamp: comment.timestamp,
                            authorHandle: comment.authorHandle,
                        });
                    }
                });

                annotations.push({
                    id: annotation.id,
                    url: annotation.url,
                    content: annotation.content,
                    author: annotation.author,
                    timestamp: annotation.timestamp,
                    comments,
                    authorHandle: annotation.authorHandle,
                    authorProfilePicture: annotation.authorProfilePicture,
                });
            }
        });
        setTimeout(resolve, 1000);
    });

    return annotations;
}