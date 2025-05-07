// src/components/Comment.tsx
import React from 'react';
import { Comment } from '@/types';
import './Comment.css';

interface CommentProps {
    comment: Comment;
    profiles: { [did: string]: { handle: string; profilePicture: string } };
}

const Comment: React.FC<CommentProps> = ({ comment, profiles }) => {
    console.log(`Comment: Looking up DID ${comment.author} for comment ${comment.id}`);
    console.log('Comment: Profiles available:', profiles);
    const profile = profiles[comment.author] || { handle: 'Unknown', profilePicture: '' };

    return (
        <div className="comment-container">
            {profile.profilePicture && (
                <img
                    src={profile.profilePicture}
                    alt="Profile"
                    className="comment-profile-picture"
                />
            )}
            <p className="comment-metadata">
                {profile.handle} • {new Date(comment.timestamp).toLocaleString()}
            </p>
            <p className="comment-text">{comment.text}</p>
        </div>
    );
};

export default Comment;