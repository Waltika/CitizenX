import React from 'react';
import { AnnotationType, ProfileType, CommentType } from '../types';

export interface AnnotationListProps {
    annotations: AnnotationType[];
    profiles: Record<string, ProfileType>;
    onDelete?: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

export const AnnotationListServer: React.FC<AnnotationListProps> = ({ annotations, profiles }) => {
    return (
        <div className="annotation-list">
            {annotations.map((annotation) => {
                const authorProfile = profiles[annotation.author] || null;
                const authorHandle = authorProfile ? authorProfile.handle : 'Unknown';
                console.log('AnnotationListServer: Rendering annotation:', annotation, 'Author handle:', authorHandle);

                // Ensure comments is an array
                const sortedComments = Array.isArray(annotation.comments)
                    ? [...annotation.comments].sort((a: CommentType, b: CommentType) => a.timestamp - b.timestamp)
                    : [];
                if (!Array.isArray(annotation.comments)) {
                    console.warn('AnnotationListServer: Invalid comments for annotation:', annotation.id, 'Comments:', annotation.comments);
                }

                return (
                    <div key={annotation.id} className="annotation-item" data-annotation-id={annotation.id}>
                        <div className="annotation-header">
                            <span className="annotation-author">{authorHandle}</span>
                            <span className="annotation-timestamp">
                                {' '}
                                • {new Date(annotation.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div
                            className="annotation-content"
                            dangerouslySetInnerHTML={{ __html: annotation.content || 'No content' }}
                        />
                        {sortedComments.length > 0 && (
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
                    </div>
                );
            })}
        </div>
    );
};