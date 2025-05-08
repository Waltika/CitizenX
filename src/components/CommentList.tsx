import React, { useState, useEffect } from 'react';
import { Annotation, Profile } from '@/types';
import { storage } from '../storage/StorageRepository';
import './AnnotationList.css';

interface CommentListProps {
    annotation: Annotation;
    profiles: Record<string, Profile>;
    isExpanded: boolean;
    onToggleComments: () => void;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
    commentInput: string;
    editorRef: (el: HTMLDivElement | null) => void;
    handleSaveComment: () => Promise<void>;
    onShowToast: (message: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({
                                                            annotation,
                                                            profiles,
                                                            isExpanded,
                                                            onToggleComments,
                                                            onSaveComment,
                                                            commentInput,
                                                            editorRef,
                                                            handleSaveComment,
                                                            onShowToast,
                                                        }) => {
    const [currentDID, setCurrentDID] = useState<string | null>(null);

    useEffect(() => {
        const fetchDID = async () => {
            const did = await storage.getCurrentDID();
            setCurrentDID(did);
        };
        fetchDID();
    }, []);

    const handleDeleteComment = async (commentId: string) => {
        try {
            await storage.deleteComment(annotation.url, annotation.id, commentId);
            onShowToast('Comment deleted successfully');
        } catch (error: any) {
            console.error('CommentList: Failed to delete comment:', error);
            onShowToast(error.message || 'Failed to delete comment');
        }
    };

    const sortedComments = annotation.comments
        ? [...annotation.comments].sort((a, b) => a.timestamp - b.timestamp)
        : [];

    return (
        <div className="comments-container">
            <button
                className="comments-toggle-button"
                onClick={onToggleComments}
            >
                {isExpanded ? '−' : '+'} {isExpanded ? 'Hide comments' : `Show ${sortedComments.length} comment${sortedComments.length > 1 ? 's' : ''}`}
            </button>
            {isExpanded && sortedComments.length > 0 && (
                <div className="comments-section">
                    {sortedComments.map((comment) => {
                        const commentAuthor = profiles[comment.author] || null;
                        const commentAuthorHandle = commentAuthor ? commentAuthor.handle : 'Unknown';
                        const isOwnComment = currentDID && comment.author === currentDID;

                        return (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-group">
                                    <div className="comment-header">
                                        <span className="comment-author">{commentAuthorHandle}</span>
                                        <span className="comment-timestamp">
                                            {' '}
                                            • {new Date(comment.timestamp).toLocaleString()}
                                        </span>
                                        {isOwnComment && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="comment-delete-button"
                                                title="Delete Comment"
                                            >
                                                <svg className="delete-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className="comment-content"
                                        dangerouslySetInnerHTML={{ __html: comment.content as string }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="add-comment-section">
                <div
                    ref={editorRef}
                    className="quill-editor"
                ></div>
            </div>
            {onSaveComment && (
                <button
                    onClick={handleSaveComment}
                    disabled={!commentInput?.trim()}
                    className="add-comment-button"
                >
                    Add Comment
                </button>
            )}
        </div>
    );
};