// src/components/AnnotationList.tsx
import React from 'react';
import { Annotation } from '../shared/types/annotation';
import Comment from './Comment';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: { [did: string]: { handle: string; profilePicture: string } };
    onDelete: (id: string) => void;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
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
        <div style={{ marginTop: '1rem' }}>
            {annotations.map((annotation) => {
                console.log(`AnnotationList: Looking up DID ${annotation.did} for annotation ${annotation._id}`);
                const profile = profiles[annotation.did] || { handle: 'Unknown', profilePicture: '' };
                return (
                    <div
                        key={annotation._id}
                        style={{
                            background: '#fff',
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            borderRadius: '5px',
                            border: '1px solid #e5e7eb',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                            {profile.profilePicture && (
                                <img
                                    src={profile.profilePicture}
                                    alt="Profile"
                                    style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%' }}
                                />
                            )}
                            <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                                {profile.handle} • {new Date(annotation.timestamp).toLocaleString()}
                            </p>
                            <span title={annotation.source === 'orbitdb' ? 'Stored in OrbitDB' : 'Stored in Local Storage'}>
                                {annotation.source === 'orbitdb' ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="1rem"
                                        height="1rem"
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
                                        width="1rem"
                                        height="1rem"
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
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#333' }}>{annotation.text}</p>
                        <button
                            onClick={() => onDelete(annotation._id)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                background: '#f97316',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fb923c')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
                        >
                            Delete
                        </button>
                        {annotation.comments && annotation.comments.length > 0 && (
                            <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
                                {annotation.comments.map((comment) => (
                                    <Comment key={comment._id} comment={comment} profiles={profiles} />
                                ))}
                            </div>
                        )}
                        {onSaveComment && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <textarea
                                    value={commentInputs[annotation._id] || ''}
                                    onChange={(e) => handleCommentChange(annotation._id, e.target.value)}
                                    placeholder="Add a comment..."
                                    style={{
                                        width: '100%',
                                        height: '2.5rem',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '5px',
                                        padding: '0.5rem',
                                        color: '#333',
                                        backgroundColor: '#fff',
                                    }}
                                />
                                <button
                                    onClick={() => handleSaveComment(annotation._id)}
                                    disabled={!commentInputs[annotation._id]}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: commentInputs[annotation._id] ? '#2c7a7b' : '#d1d5db',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: commentInputs[annotation._id] ? 'pointer' : 'not-allowed',
                                        fontSize: '0.8rem',
                                    }}
                                    onMouseEnter={(e) => commentInputs[annotation._id] && (e.currentTarget.style.backgroundColor = '#4a999a')}
                                    onMouseLeave={(e) => commentInputs[annotation._id] && (e.currentTarget.style.backgroundColor = '#2c7a7b')}
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