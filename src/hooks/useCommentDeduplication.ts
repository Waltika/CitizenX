import { useState, useCallback, useMemo, useEffect } from 'react';
import { Annotation, Comment } from '@/types';

interface PendingComment {
    tempId: string;
    annotationId: string;
    content: string;
    timestamp: number;
}

export const useCommentDeduplication = (rawAnnotations: Annotation[], url: string) => {
    const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);

    useEffect(() => {
        console.log('useCommentDeduplication: URL changed, clearing pending comments - url:', url);
        setPendingComments([]);
    }, [url]);

    const deduplicateComments = useCallback(
        (annotations: Annotation[]) => {
            console.log('useCommentDeduplication: Deduplicating comments for annotations:', annotations.length);
            return annotations.map((annotation) => {
                if (!annotation.comments) return annotation;
                const seenComments = new Map<string, any>();
                const uniqueComments = annotation.comments.filter((comment: Comment) => {
                    if (!comment || !comment.id) return false;

                    const pendingMatch = pendingComments.find(
                        (pending) =>
                            pending.annotationId === annotation.id &&
                            pending.content === comment.content &&
                            Math.abs(pending.timestamp - comment.timestamp) < 1000
                    );

                    if (pendingMatch) return false;

                    if (seenComments.has(comment.id)) return false;

                    const key = `${comment.content}-${comment.timestamp}`;
                    if (seenComments.has(key)) return false;

                    seenComments.set(comment.id, comment);
                    seenComments.set(key, comment);
                    return true;
                });

                return { ...annotation, comments: uniqueComments };
            });
        },
        [pendingComments]
    );

    const validAnnotations = useMemo(() => {
        console.log('useCommentDeduplication: Computing validAnnotations - rawAnnotations:', rawAnnotations.length);
        const deduplicated = deduplicateComments(rawAnnotations);
        return deduplicated
            .filter((annotation) => annotation.id && annotation.author && annotation.content)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [rawAnnotations, deduplicateComments]);

    const handleSaveComment = useCallback(
        async (originalHandleSaveComment: (annotationId: string, content: string) => Promise<void>, annotationId: string, content: string) => {
            console.log('useCommentDeduplication: handleSaveComment called - annotationId:', annotationId, 'content:', content);
            const timestamp = Date.now();
            const tempCommentId = `temp-${timestamp}`;
            const pendingComment: PendingComment = {
                tempId: tempCommentId,
                annotationId,
                content,
                timestamp,
            };

            setPendingComments((prev) => [...prev, pendingComment]);

            try {
                await originalHandleSaveComment(annotationId, content);
                setPendingComments((prev) => prev.filter((pc) => pc.tempId !== tempCommentId));
            } catch (error) {
                console.error('useCommentDeduplication: Failed to save comment:', error);
                setPendingComments((prev) => prev.filter((pc) => pc.tempId !== tempCommentId));
                throw error;
            }
        },
        []
    );

    return { validAnnotations, handleSaveComment, pendingComments, setPendingComments };
};