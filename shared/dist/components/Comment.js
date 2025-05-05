import React from 'react';
export const Comment = ({ comment, profiles }) => {
    console.log(`Comment: Looking up DID ${comment.author} for comment ${comment.id}`);
    console.log('Comment: Profiles available:', profiles);
    const profile = profiles[comment.author] || { did: comment.author, handle: 'Unknown', profilePicture: '' };
    return (React.createElement("div", { style: { marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' } },
        profile.profilePicture && (React.createElement("img", { src: profile.profilePicture, alt: "Profile", style: { width: '1.25rem', height: '1.25rem', borderRadius: '50%' } })),
        React.createElement("p", { style: { margin: '0', fontSize: '0.8rem', color: '#666' } },
            profile.handle,
            " \u2022 ",
            new Date(comment.timestamp).toLocaleString()),
        React.createElement("p", { style: { margin: '0 0 0 0.5rem', fontSize: '0.8rem', color: '#333' } }, comment.content)));
};
