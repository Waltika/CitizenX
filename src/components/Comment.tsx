// src/components/Comment.tsx
import React from 'react';
import { Comment } from '../shared/types/annotation';

interface CommentProps {
    comment: Comment;
    creatorProfile?: { handle: string; profilePicture: string };
}

const Comment: React.FC<CommentProps> = ({ comment, creatorProfile }) => {
    return (
        <div style={{ marginLeft: '1rem', marginTop: '0.5rem', borderLeft: '2px solid #e5e7eb', paddingLeft: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                {creatorProfile?.profilePicture && (
                    <img
                        src={creatorProfile.profilePicture}
                        alt="Profile"
                        style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', marginRight: '0.5rem' }}
                    />
                )}
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                    {creatorProfile?.handle || 'Anonymous'} • {new Date(comment.timestamp).toLocaleString()}
                </p>
            </div>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#333' }}>{comment.text}</p>
        </div>
    );
};

export default Comment;