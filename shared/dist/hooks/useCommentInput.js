// src/hooks/useCommentInput.ts
import { useState } from 'react';
export function useCommentInput({ onSaveComment }) {
    const [commentInputs, setCommentInputs] = useState({});
    const handleCommentChange = (annotationId, value) => {
        setCommentInputs((prev) => ({ ...prev, [annotationId]: value }));
    };
    const handleSaveComment = async (annotationId) => {
        if (!onSaveComment || !commentInputs[annotationId])
            return;
        await onSaveComment(annotationId, commentInputs[annotationId]);
        setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
    };
    return {
        commentInputs,
        handleCommentChange,
        handleSaveComment,
    };
}
