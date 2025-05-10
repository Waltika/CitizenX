import React, { useState, useEffect, useCallback } from 'react';
import { SettingsPanel } from './SettingsPanel';
import { Profile } from '@/types';
import './ConnectedUser.css';
import './ProfileModal.css';

interface ProfileSectionProps {
    did: string | null;
    profile: Profile | null;
    profileLoading: boolean;
    profileError: string | null;
    authenticate: () => Promise<void>;
    signOut: () => Promise<void>;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    createProfile: (handle: string, profilePicture?: string) => Promise<void>;
    updateProfile: (handle: string, profilePicture?: string) => Promise<void>;
    onShowToast: (message: string) => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
                                                                  did,
                                                                  profile,
                                                                  profileLoading,
                                                                  profileError,
                                                                  authenticate,
                                                                  signOut,
                                                                  exportIdentity,
                                                                  importIdentity,
                                                                  createProfile,
                                                                  updateProfile,
                                                                  onShowToast,
                                                              }) => {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [justImported, setJustImported] = useState(false);

    useEffect(() => {
        console.log('ProfileSection: Checking profile state - profileLoading:', profileLoading, 'did:', did, 'justImported:', justImported);
        if (!profileLoading && did && !justImported) {
            if (!profile || !profile.handle) {
                setIsProfileModalOpen(true);
            }
        }
    }, [profileLoading, did, profile, justImported]);

    const handleProfileSave = useCallback(async () => {
        if (profileHandle.trim()) {
            if (profile) {
                await updateProfile(profileHandle, profilePicture);
            } else {
                await createProfile(profileHandle, profilePicture);
            }
            setIsProfileModalOpen(false);
            setProfileHandle('');
            setProfilePicture(undefined);
        }
    }, [profile, profileHandle, profilePicture, updateProfile, createProfile]);

    const handleCloseSettings = useCallback((justImported?: boolean) => {
        if (justImported) {
            setJustImported(true);
        }
    }, []);

    const handleBeforeImport = useCallback(() => {
        setJustImported(true);
    }, []);

    const handleResetJustImported = useCallback(() => {
        setJustImported(false);
    }, []);

    return (
        <div className="connected-section">
            {profileError && <div className="error-text">{profileError}</div>}
            <div className="connected-section-content">
                <div className="connected-user-info">
                    {profile ? (
                        <>
                            {profile.profilePicture && <img src={profile.profilePicture} alt="Profile" className="profile-picture" />}
                            <p className="connected-text">Connected: {profile.handle}</p>
                        </>
                    ) : (
                        <p className="connected-text">Not connected</p>
                    )}
                </div>
                <SettingsPanel
                    did={did}
                    authenticate={authenticate}
                    signOut={signOut}
                    exportIdentity={exportIdentity}
                    importIdentity={importIdentity}
                    onCloseSettings={handleCloseSettings}
                    onBeforeImport={handleBeforeImport}
                    onResetJustImported={handleResetJustImported}
                    onShowToast={onShowToast}
                />
            </div>
            {isProfileModalOpen && (
                <div className="profile-modal">
                    <h2 className="profile-modal-title">{profile ? 'Update Profile' : 'Create Profile'}</h2>
                    <input
                        type="text"
                        value={profileHandle}
                        onChange={(e) => setProfileHandle(e.target.value)}
                        placeholder="Enter your handle"
                        className="profile-modal-input"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setProfilePicture(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="profile-modal-file-input"
                    />
                    {profilePicture && <img src={profilePicture} alt="Preview" className="profile-modal-preview" />}
                    <div className="profile-modal-buttons">
                        <button onClick={handleProfileSave} className="profile-modal-save-button">Save Profile</button>
                        <button onClick={() => setIsProfileModalOpen(false)} className="profile-modal-cancel-button">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};