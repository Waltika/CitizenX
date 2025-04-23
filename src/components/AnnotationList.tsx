// src/components/AnnotationList.tsx
import React, { useState } from 'react';
import { Annotation, Comment } from '../shared/types/annotation';
import CommentComponent from './Comment';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Map<string, { handle: string; profilePicture: string }>;
    onDelete: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
    const [newComment, setNewComment] = useState<{ [key: string]: string }>({});

    const handleCommentSubmit = async (annotationId: string) => {
        if (!onSaveComment || !newComment[annotationId]) return;
        try {
            await onSaveComment(annotationId, newComment[annotationId]);
            setNewComment((prev) => ({ ...prev, [annotationId]: '' }));
        } catch (err) {
            console.error('Failed to submit comment:', err);
        }
    };

    return (
        <div>
            {annotations.map((annotation) => {
                const creatorProfile = profiles.get(annotation.did || '');
                return (
                    <div
                        key={annotation._id}
                        style={{
                            background: '#fff',
                            padding: '0.5rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '5px',
                            marginBottom: '0.5rem',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {creatorProfile?.profilePicture && (
                                    <img
                                        src={creatorProfile.profilePicture}
                                        alt="Profile"
                                        style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', marginRight: '0.5rem' }}
                                    />
                                )}
                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#333' }}>
                                    {creatorProfile?.handle || 'Anonymous'} • {new Date(annotation.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => onDelete(annotation._id)}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#e11d48',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f43f5e')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e11d48')}
                            >
                                Delete
                            </button>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#333' }}>{annotation.text}</p>
                        {/* Display comments */}
                        {annotation.comments && annotation.comments.length > 0 && (
                            <div style={{ marginTop: '0.5rem' }}>
                                {annotation.comments.map((comment: Comment) => (
                                    <CommentComponent
                                        key={comment._id}
                                        comment={comment}
                                        creatorProfile={profiles.get(comment.did)}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Comment input form */}
                        {onSaveComment && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <textarea
                                    value={newComment[annotation._id] || ''}
                                    onChange={(e) =>
                                        setNewComment((prev) => ({
                                            ...prev,
                                            [annotation._id]: e.target.value,
                                        }))
                                    }
                                    placeholder="Add a comment..."
                                    style={{
                                        width: '100%',
                                        height: '3rem',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.9rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '5px',
                                        padding: '0.5rem',
                                        color: '#333',
                                        backgroundColor: '#fff',
                                    }}
                                />
                                <button
                                    onClick={() => handleCommentSubmit(annotation._id)}
                                    disabled={!newComment[annotation._id]}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: newComment[annotation._id] ? '#2c7a7b' : '#d1d5db',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: newComment[annotation._id] ? 'pointer' : 'not-allowed',
                                        width: '100%',
                                        fontSize: '0.9rem',
                                    }}
                                    onMouseEnter={(e) =>
                                        newComment[annotation._id] && (e.currentTarget.style.backgroundColor = '#4a999a')
                                    }
                                    onMouseLeave={(e) =>
                                        newComment[annotation._id] && (e.currentTarget.style.backgroundColor = '#2c7a7b')
                                    }
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

export default AnnotationList;