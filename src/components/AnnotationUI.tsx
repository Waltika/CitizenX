import React, { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAnnotations } from '@/hooks/useAnnotations';
import { AnnotationList } from './AnnotationList';
import { SettingsPanel } from './SettingsPanel';
import { Toast } from './Toast';
import './AnnotationUI.css';

import Quill from 'quill';
import 'quill/dist/quill.snow.css';

import citizenxLogo from '../assets/citizenx-logo.png';
import { normalizeUrl } from "@/shared/utils/normalizeUrl";

interface AnnotationUIProps {
    url: string;
    isUrlLoading: boolean;
}

export const AnnotationUI: React.FC<AnnotationUIProps> = ({ url, isUrlLoading }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations, profiles, error: annotationsError, loading: annotationsLoading, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = useAnnotations({ url, did });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    // Initialize Quill editor for annotation input
    useEffect(() => {
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link']
                    ]
                },
                placeholder: 'Enter annotation...'
            });

            // Update state on content change
            quillRef.current.on('text-change', () => {
                const content = quillRef.current?.root.innerHTML || '';
                setAnnotationText(content === '<p><br></p>' ? '' : content);
            });
        }

        return () => {
            if (quillRef.current) {
                quillRef.current.off('text-change');
                quillRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!profileLoading && did && !profile) {
            console.log('AnnotationUI: Opening Update Profile modal');
            setIsProfileModalOpen(true);
        } else {
            console.log('AnnotationUI: Profile modal conditions - loading:', profileLoading, 'did:', did, 'profile:', profile);
        }
    }, [profileLoading, did, profile]);

    useEffect(() => {
        console.log('AnnotationUI: annotationsLoading changed:', annotationsLoading);
    }, [annotationsLoading]);

    const handleSave = async () => {
        if (annotationText.trim()) {
            await handleSaveAnnotation(annotationText);
            setAnnotationText('');
            if (quillRef.current) {
                quillRef.current.setContents([]);
            }
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

    const handleShowToast = (message: string) => {
        console.log('AnnotationUI: Showing toast with message:', message);
        setToastMessage(message);
        setShowToast(true);
    };

    useEffect(() => {
        const setupChromeMessageListener = () => {
            const handleMessage = (message: any) => {
                if (message.type === 'HIGHLIGHT_ANNOTATION' && message.url === normalizeUrl(url)) {
                    const annotationElement = document.querySelector(`[data-annotation-id="${message.annotationId}"]`);
                    if (annotationElement) {
                        annotationElement.scrollIntoView({ behavior: 'smooth' });
                        annotationElement.classList.add('highlight');
                        setTimeout(() => annotationElement.classList.remove('highlight'), 3000);
                    }
                }
            };

            chrome.runtime.onMessage.addListener(handleMessage);
            return () => chrome.runtime.onMessage.removeListener(handleMessage);
        };

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            return setupChromeMessageListener();
        }
    }, [url]);

    console.log('AnnotationUI: Rendering with annotations:', annotations, 'profiles:', profiles, 'loading:', annotationsLoading);

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
                    <SettingsPanel
                        did={did}
                        authenticate={authenticate}
                        signOut={signOut}
                        exportIdentity={exportIdentity}
                        importIdentity={importIdentity}
                    />
                </div>
            </div>
            <div className="annotation-input">
                <div ref={editorRef} className="quill-editor"></div>
                <button
                    onClick={handleSave}
                    className="annotation-save-button"
                    disabled={!annotationText.trim() || !did || annotationsLoading || !url || isUrlLoading}
                >
                    Save
                </button>
            </div>
            {annotationsLoading ? (
                <div className="loading-spinner">
                    <span>Loading annotations...</span>
                </div>
            ) : (
                <div className="annotation-list-wrapper">
                    <AnnotationList
                        annotations={annotations}
                        profiles={profiles}
                        onDelete={handleDeleteAnnotation}
                        onSaveComment={!did || annotationsLoading ? undefined : handleSaveComment}
                        currentUrl={url}
                        onShowToast={handleShowToast}
                    />
                </div>
            )}
            <Toast
                message={toastMessage}
                isVisible={showToast}
                setIsVisible={setShowToast}
            />
            <div className="footer-container">
                <div className="logo-container">
                    <a href="https://citizenx.app" target="_blank" rel="noopener noreferrer">
                        <img src={citizenxLogo} alt="CitizenX Logo" className="citizenx-logo" />
                    </a>
                </div>
                <div className="url-footer">
                    <p className="url-text">
                        Annotating: <span className="url">{isUrlLoading || !url ? 'Loading URL...' : url}</span>
                    </p>
                </div>
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