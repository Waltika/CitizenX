// src/hooks/useCommentInput.ts
import { useState } from 'react';

interface UseCommentInputProps {
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

interface UseCommentInputResult {
    commentInputs: { [key: string]: string };
    handleCommentChange: (annotationId: string, value: string) => void;
    handleSaveComment: (annotationId: string) => Promise<void>;
}

export function useCommentInput({ onSaveComment }: UseCommentInputProps): UseCommentInputResult {
    const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});

    const handleCommentChange = (annotationId: string, value: string) => {
        setCommentInputs((prev) => ({ ...prev, [annotationId]: value }));
    };

    const handleSaveComment = async (annotationId: string) => {
        if (!onSaveComment || !commentInputs[annotationId]) return;
        await onSaveComment(annotationId, commentInputs[annotationId]);
        setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
    };

    return {
        commentInputs,
        handleCommentChange,
        handleSaveComment,
    };
}