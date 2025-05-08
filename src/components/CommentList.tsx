import React from 'react';
import { Annotation, Profile } from '@/types';
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
                                                        }) => {
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
                        return (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-group">
                                    <div className="comment-header">
                                        <span className="comment-author">{commentAuthorHandle}</span>
                                        <span className="comment-timestamp">
                                            {' '}
                                            • {new Date(comment.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div
                                        className="comment-content"
                                        dangerouslySetInnerHTML={{ __html: comment.content }}
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