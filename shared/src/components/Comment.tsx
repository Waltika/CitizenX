import React from 'react';
import {CommentType, ProfileType} from '../types';

interface CommentProps {
    comment: CommentType;
    profiles: Record<string, ProfileType>;
}

export const Comment: React.FC<CommentProps> = ({ comment, profiles }) => {
    console.log(`Comment: Looking up DID ${comment.author} for comment ${comment.id}`);
    console.log('Comment: Profiles available:', profiles);
    const profile = profiles[comment.author] || { did: comment.author, handle: 'Unknown', profilePicture: '' };

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
            <p style={{ margin: '0 0 0 0.5rem', fontSize: '0.8rem', color: '#333' }}>{comment.content}</p>
        </div>
    );
};