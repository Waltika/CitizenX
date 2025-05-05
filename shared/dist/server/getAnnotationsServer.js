export async function getAnnotationsServer({ gun, url, normalizeUrl }) {
    const normalizedUrl = normalizeUrl(url);
    const annotations = [];
    await new Promise((resolve) => {
        gun.get('annotations').get(normalizedUrl).map().once((annotation) => {
            if (annotation) {
                const comments = [];
                gun.get('annotations').get(normalizedUrl).get(annotation.id).get('comments').map().once((comment) => {
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
