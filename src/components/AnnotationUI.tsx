import React, { useState, useEffect } from 'react';
import { useUserProfile } from '../hooks/useUserProfiles';
import { useAnnotations } from '../hooks/useAnnotations';
import { AnnotationList } from './AnnotationList';
import './AnnotationUI.css';

interface AnnotationUIProps {
    url: string;
    isPopupUrl: boolean;
}

export const AnnotationUI: React.FC<AnnotationUIProps> = ({ url, isPopupUrl }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations, profiles, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = useAnnotations({ url, did });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State for settings menu
    const [importIdentityData, setImportIdentityData] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportedIdentity, setExportedIdentity] = useState('');

    useEffect(() => {
        if (!profileLoading && did && !profile) {
            console.log('AnnotationUI: Opening Update Profile modal');
            setIsProfileModalOpen(true);
        } else {
            console.log('AnnotationUI: Profile modal conditions - loading:', profileLoading, 'did:', did, 'profile:', profile);
        }
    }, [profileLoading, did, profile]);

    const handleSave = async () => {
        if (annotationText.trim() && !isPopupUrl) {
            await handleSaveAnnotation(annotationText);
            setAnnotationText('');
        }
    };

    const handleProfileSave = async () => {
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
    };

    const handleAuthenticate = async () => {
        await authenticate();
        setIsSettingsOpen(false);
    };

    const handleSignOut = async () => {
        await signOut();
        setIsSettingsOpen(false);
    };

    const handleExportIdentity = async () => {
        try {
            const identity = await exportIdentity();
            setExportedIdentity(identity);
            setIsExportModalOpen(true);
            setIsSettingsOpen(false);
        } catch (err) {
            console.error('Failed to export identity:', err);
        }
    };

    const handleImportIdentity = async () => {
        try {
            await importIdentity(importIdentityData);
            setImportIdentityData('');
            setIsSettingsOpen(false);
        } catch (err) {
            console.error('Failed to import identity:', err);
        }
    };

    console.log('AnnotationUI: Rendering with annotations:', annotations, 'profiles:', profiles);

    return (
        <div className="annotation-ui-container">
            {profileError && <div className="error-text">{profileError}</div>}
            {annotationsError && <div className="error-text">{annotationsError}</div>}
            <div className="connected-section">
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
                    <div className="settings-menu-container">
                        <button
                            className="settings-button"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        >
                            ⚙️
                        </button>
                        {isSettingsOpen && (
                            <div className="settings-menu">
                                {!did ? (
                                    <>
                                        <button
                                            className="settings-menu-button"
                                            onClick={handleAuthenticate}
                                        >
                                            Authenticate
                                        </button>
                                        <textarea
                                            className="import-textarea"
                                            value={importIdentityData}
                                            onChange={(e) => setImportIdentityData(e.target.value)}
                                            placeholder="Paste identity to import..."
                                        />
                                        <button
                                            className="settings-menu-button"
                                            onClick={handleImportIdentity}
                                            disabled={!importIdentityData.trim()}
                                        >
                                            Import Identity
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="settings-menu-button"
                                            onClick={handleExportIdentity}
                                        >
                                            Export Identity
                                        </button>
                                        <button
                                            className="settings-menu-button sign-out-button"
                                            onClick={handleSignOut}
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {!isPopupUrl && (
                <div className="annotation-input">
                    <textarea
                        value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                        placeholder="Enter annotation..."
                        className="annotation-textarea"
                        disabled={!did} // Disable if not authenticated
                    />
                    <button
                        onClick={handleSave}
                        className="annotation-save-button"
                        disabled={!annotationText.trim() || !did}
                    >
                        Save
                    </button>
                </div>
            )}
            <AnnotationList
                annotations={annotations}
                profiles={profiles}
                onDelete={handleDeleteAnnotation}
                onSaveComment={isPopupUrl || !did ? undefined : handleSaveComment}
            />
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
            {isExportModalOpen && (
                <div className="export-modal">
                    <h2 className="export-modal-title">Export Identity</h2>
                    <textarea
                        className="export-modal-textarea"
                        value={exportedIdentity}
                        readOnly
                    />
                    <button
                        className="export-modal-button"
                        onClick={() => navigator.clipboard.writeText(exportedIdentity)}
                    >
                        Copy to Clipboard
                    </button>
                    <button
                        className="export-modal-close-button"
                        onClick={() => setIsExportModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};