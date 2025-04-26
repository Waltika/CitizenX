// src/components/AnnotationList.tsx
import React from 'react';
import { Annotation } from '../shared/types/annotation';
import Comment from './Comment';
import './AnnotationList.css'; // Import the CSS file

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: { [did: string]: { handle: string; profilePicture: string } };
    onDelete: (id: string) => void;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
    const [commentInputs, setCommentInputs] = React.useState<{ [key: string]: string }>({});

    const handleCommentChange = (annotationId: string, value: string) => {
        setCommentInputs((prev) => ({ ...prev, [annotationId]: value }));
    };

    const handleSaveComment = async (annotationId: string) => {
        if (!onSaveComment || !commentInputs[annotationId]) return;
        await onSaveComment(annotationId, commentInputs[annotationId]);
        setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
    };

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
                            <span
                                title={annotation.source === 'orbitdb' ? 'Stored in OrbitDB' : 'Stored in Local Storage'}
                            >
                {annotation.source === 'orbitdb' ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="annotation-source-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2c7a7b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M2 17h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H2"></path>
                        <path d="M20 17h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path>
                        <path d="M9 17h6"></path>
                        <rect x="6" y="3" width="12" height="4" rx="2"></rect>
                        <rect x="6" y="17" width="12" height="4" rx="2"></rect>
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="annotation-source-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2"></path>
                        <path d="M12 2v4"></path>
                        <path d="M12 18v4"></path>
                        <path d="M12 10v4"></path>
                    </svg>
                )}
              </span>
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
