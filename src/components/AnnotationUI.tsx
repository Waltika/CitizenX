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
    const { did, profile, loading: profileLoading, error: profileError, createProfile, updateProfile } = useUserProfile();
    const { annotations, profiles, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = useAnnotations({ url, did });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);

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

    // Debug log to track renders
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
                </div>
            </div>
            {!isPopupUrl && (
                <div className="annotation-input">
                    <textarea
                        value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                        placeholder="Enter annotation..."
                        className="annotation-textarea"
                    />
                    <button
                        onClick={handleSave}
                        className="annotation-save-button"
                        disabled={!annotationText.trim()}
                    >
                        Save
                    </button>
                </div>
            )}
            <AnnotationList
                annotations={annotations}
                profiles={profiles}
                onDelete={handleDeleteAnnotation}
                onSaveComment={isPopupUrl ? undefined : handleSaveComment}
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
        </div>
    );
};