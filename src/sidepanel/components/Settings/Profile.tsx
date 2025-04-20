// src/sidepanel/components/Settings/Profile.tsx
import React, { useState, useEffect } from 'react';
import { profileService } from '../../../background/services/profiles';

interface ProfileProps {
    userId: string;
}

export const Profile: React.FC<ProfileProps> = ({ userId }) => {
    const [displayName, setDisplayName] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        profileService.getProfile(userId).then((profile) => {
            setDisplayName(profile.displayName || '');
            setProfilePicture(profile.profilePicture || '');
        }).catch((err) => {
            console.error('Failed to load profile:', err);
            setError('Failed to load profile');
        });
    }, [userId]);

    const handleSaveProfile = async () => {
        try {
            await profileService.setProfile({
                uid: userId,
                displayName,
                profilePicture
            });
            setError('');
        } catch (err) {
            console.error('Failed to save profile:', err);
            setError('Failed to save profile');
        }
    };

    return (
        <div style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <h2>Profile Settings</h2>
            {error && <p style={{ color: 'red', fontSize: '12px', margin: '5px 0' }}>{error}</p>}
            <div>
                <label>
                    Display Name:
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        style={{
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </label>
                <label>
                    Profile Picture URL:
                    <input
                        type="text"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="Enter image URL"
                        style={{
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </label>
                <button
                    onClick={handleSaveProfile}
                    style={{
                        padding: '8px',
                        fontSize: '14px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Save Profile
                </button>
            </div>
        </div>
    );
};