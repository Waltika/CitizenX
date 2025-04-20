// src/popup/components/Settings/Profile.tsx
import React, { useState, useEffect } from 'react';
import { profileService } from '../../../background/services/profiles';
import { Profile } from '../../../shared/types/profile';
import './Profile.css';

interface ProfileSettingsProps {
    uid: string;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ uid }) => {
    const [profile, setProfile] = useState<Profile>({ uid });
    const [displayName, setDisplayName] = useState('');
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
        profileService.getProfile(uid).then((storedProfile) => {
            setProfile(storedProfile);
            setDisplayName(storedProfile.displayName || '');
            setProfilePicture(storedProfile.profilePicture || '');
        });
    }, [uid]);

    const handleSave = async () => {
        const updatedProfile: Profile = {
            uid,
            displayName: displayName.trim() || undefined,
            profilePicture: profilePicture.trim() || undefined
        };
        await profileService.setProfile(updatedProfile);
        setProfile(updatedProfile);
    };

    return (
        <div className="profile-settings">
            <h2>Profile Settings</h2>
            <div>
                <label>Display Name:</label>
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={30}
                />
            </div>
            <div>
                <label>Profile Picture URL:</label>
                <input
                    type="text"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder="Enter image URL"
                />
            </div>
            <button onClick={handleSave}>Save Profile</button>
            {profile.displayName && (
                <p>Current: {profile.displayName}</p>
            )}
            {profile.profilePicture && (
                <img src={profile.profilePicture} alt="Profile" width="24" height="24" />
            )}
        </div>
    );
};