// src/components/Comment.tsx
import React from 'react';
import { Comment } from '../shared/types/annotation';

interface CommentProps {
    comment: Comment;
    profiles: { [did: string]: { handle: string; profilePicture: string } };
}

const Comment: React.FC<CommentProps> = ({ comment, profiles }) => {
    const profile = profiles[comment.did] || { handle: 'Unknown', profilePicture: '' };

    return (
        <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {profile.profilePicture && (
                <img
                    src={profile.profilePicture}
                    alt="Profile"
                    style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%' }}
                />
            )}
            <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                {profile.handle} • {new Date(comment.timestamp).toLocaleString()}
            </p>
            <span title={comment.source === 'orbitdb' ? 'Stored in OrbitDB' : 'Stored in Local Storage'}>
                {comment.source === 'orbitdb' ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="0.8rem"
                        height="0.8rem"
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
                        width="0.8rem"
                        height="0.8rem"
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
            <p style={{ margin: '0 0 0 0.5rem', fontSize: '0.8rem', color: '#333' }}>{comment.text}</p>
        </div>
    );
};

export default Comment;