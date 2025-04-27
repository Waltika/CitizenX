// src/components/AnnotationList.tsx
import React from 'react';
import { Annotation } from '../storage/StorageRepository';
import { useCommentInput } from '../hooks/useCommentInput';
import Comment from './Comment';
import './AnnotationList.css';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: { [did: string]: { handle: string; profilePicture: string } };
    onDelete: (id: string) => void;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
    const { commentInputs, handleCommentChange, handleSaveComment } = useCommentInput({ onSaveComment });

    console.log('AnnotationList: Profiles available:', profiles);
    console.log('AnnotationList: Annotations:', annotations);

    return (
        <div className="annotation-list-container">
            {annotations.map((annotation) => {
                console.log(`AnnotationList: Looking up DID ${annotation.did} for annotation ${annotation._id}`);
                const profile = profiles[annotation.did] || { handle: 'Unknown', profilePicture: '' };
                return (
                    <div key={annotation._id} className="annotation-item">
                        <div className="annotation-header">
                            {profile.profilePicture && (
                                <img
                                    src={profile.profilePicture}
                                    alt="Profile"
                                    className="annotation-profile-picture"
                                />
                            )}
                            <p className="annotation-user-info">
                                {profile.handle} • {new Date(annotation.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <p className="annotation-text">{annotation.text}</p>
                        <button
                            onClick={() => onDelete(annotation._id)}
                            className="delete-button"
                        >
                            Delete
                        </button>
                        {annotation.comments && annotation.comments.length > 0 && (
                            <div className="comments-container">
                                {annotation.comments.map((comment) => (
                                    <Comment key={comment._id} comment={comment} profiles={profiles} />
                                ))}
                            </div>
                        )}
                        {onSaveComment && (
                            <div className="comment-input-section">
                                <textarea
                                    value={commentInputs[annotation._id] || ''}
                                    onChange={(e) => handleCommentChange(annotation._id, e.target.value)}
                                    placeholder="Add a comment..."
                                    className="comment-textarea"
                                />
                                <button
                                    onClick={() => handleSaveComment(annotation._id)}
                                    disabled={!commentInputs[annotation._id]}
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