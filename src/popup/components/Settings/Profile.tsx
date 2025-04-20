// src/popup/components/Settings/Profile.tsx
import React, { useState, useEffect } from 'react';
import { profileService } from '../../../background/services/profiles';
import '../../styles/components/Settings.module.css';

interface ProfileProps {
    userId: string;
}

export const Profile: React.FC<ProfileProps> = ({ userId }) => {
    const [displayName, setDisplayName] = useState('');
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
        profileService.getProfile(userId).then((profile) => {
            setDisplayName(profile.displayName || '');
            setProfilePicture(profile.profilePicture || '');
        });
    }, [userId]);

    const handleSaveProfile = async () => {
        await profileService.setProfile({
            uid: userId,
            displayName,
            profilePicture
        });
    };

    return (
        <div className="profile-settings">
            <h2>Profile Settings</h2>
            <div>
                <label>
                    Display Name:
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                    />
                </label>
                <label>
                    Profile Picture URL:
                    <input
                        type="text"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="Enter image URL"
                    />
                </label>
                <button onClick={handleSaveProfile}>Save Profile</button>
            </div>
        </div>
    );
};