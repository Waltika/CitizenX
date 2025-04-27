import React, { useState } from 'react';
import { Annotation, Profile } from '../types';
import './AnnotationList.css';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    onDelete: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    const handleCommentChange = (annotationId: string, value: string) => {
        setCommentInputs((prev) => ({ ...prev, [annotationId]: value }));
    };

    const handleSaveComment = async (annotationId: string) => {
        const content = commentInputs[annotationId] || '';
        if (content.trim() && onSaveComment) {
            console.log('AnnotationList: Saving comment for annotation:', annotationId, content);
            await onSaveComment(annotationId, content);
            setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
        } else {
            console.warn('AnnotationList: Cannot save comment - empty content or onSaveComment not provided', { content, onSaveComment: !!onSaveComment });
        }
    };

    return (
        <div className="annotation-list">
            {annotations.map((annotation) => {
                const authorProfile = profiles[annotation.author] || null;
                const authorHandle = authorProfile ? authorProfile.handle : 'Unknown';
                console.log('AnnotationList: Rendering annotation:', annotation, 'Author handle:', authorHandle);

                return (
                    <div key={annotation.id} className="annotation-item">
                        <div className="annotation-header">
                            <span className="annotation-author">{authorHandle}</span>
                            <span className="annotation-timestamp">
                                {' '}
                                • {new Date(annotation.timestamp).toLocaleString()}
                            </span>
                            <button
                                onClick={() => onDelete(annotation.id)}
                                className="delete-button"
                            >
                                Delete
                            </button>
                        </div>
                        <p className="annotation-content">{annotation.content || 'No content'}</p>
                        {annotation.comments && annotation.comments.length > 0 && (
                            <div className="comments-section">
                                {annotation.comments.map((comment) => {
                                    const commentAuthor = profiles[comment.author] || null;
                                    const commentAuthorHandle = commentAuthor ? commentAuthor.handle : 'Unknown';
                                    return (
                                        <div key={comment.id} className="comment-item">
                                            <span className="comment-author">{commentAuthorHandle}</span>
                                            <span className="comment-timestamp">
                                                {' '}
                                                • {new Date(comment.timestamp).toLocaleString()}
                                            </span>
                                            <p className="comment-content">{comment.content}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {onSaveComment && (
                            <div className="add-comment-section">
                                <textarea
                                    value={commentInputs[annotation.id] || ''}
                                    onChange={(e) => handleCommentChange(annotation.id, e.target.value)}
                                    placeholder="Add a comment..."
                                    className="comment-textarea"
                                />
                                <button
                                    onClick={() => handleSaveComment(annotation.id)}
                                    disabled={!commentInputs[annotation.id]?.trim()}
                                    className="add-comment-button"
                                >
                                    Add Comment
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};