import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAnnotations } from '../hooks/useAnnotations';
import { AnnotationList } from './AnnotationList';
import { SettingsPanel } from './SettingsPanel';
import { Toast } from './Toast';
import './styles/variables.css';
import './styles/common.css';
import './AnnotationUI.css';
import './ProfileModal.css';
import './annotation-input.css';
import './Footer.css';
import './LoadingSpinner.css';
import './ConnectedUser.css';
import './ExportIdentitySection.css';
import './SettingsPanel.css';
import './Comment.css';

import Quill from 'quill';
import 'quill/dist/quill.snow.css';

import citizenxLogo from '../assets/citizenx-logo.png';
import { normalizeUrl } from "../shared/utils/normalizeUrl";

interface AnnotationUIProps {
    url: string;
    isUrlLoading: boolean;
    tabId?: number;
}

const MemoizedAnnotationList = React.memo(AnnotationList);

export const AnnotationUI: React.FC<AnnotationUIProps> = ({ url, isUrlLoading, tabId }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations, profiles, error: annotationsError, loading: annotationsLoading, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment, handleDeleteComment } = useAnnotations({ url, did, tabId });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);
    const [justImported, setJustImported] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

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
        console.log('AnnotationUI: Profile modal conditions - loading:', profileLoading, 'did:', did, 'profile:', profile);
        if (!profileLoading && did && !justImported) {
            if (!profile || !profile.handle) {
                console.log('AnnotationUI: Opening Update Profile modal');
                setIsProfileModalOpen(true);
            }
        }
    }, [profileLoading, did, profile, justImported]);

    useEffect(() => {
        console.log('AnnotationUI: annotationsLoading changed:', annotationsLoading);
    }, [annotationsLoading]);

    const handleSave = async () => {
        if (!annotationText.trim()) return;

        let validatedTabId: number | undefined = tabId;
        if (typeof chrome !== 'undefined' && chrome.tabs && tabId) {
            try {
                const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
                    chrome.tabs.get(tabId, (tab) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(tab);
                        }
                    });
                });
                if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                    validatedTabId = tab.id;
                    console.log('AnnotationUI: Valid tabId for screenshot capture:', validatedTabId);
                } else {
                    console.warn('AnnotationUI: Cannot capture screenshot, tab URL is restricted:', tab.url);
                    handleShowToast('Cannot capture screenshot for this page');
                    validatedTabId = undefined;
                }
            } catch (error) {
                console.error('AnnotationUI: Failed to validate tabId:', error);
                handleShowToast('Failed to access tab for screenshot');
                validatedTabId = undefined;
            }
        } else if (!tabId) {
            console.warn('AnnotationUI: No tabId provided for screenshot capture');
            handleShowToast('No active tab available for screenshot');
        }

        try {
            await handleSaveAnnotation(annotationText, validatedTabId);
            setAnnotationText('');
            if (quillRef.current) {
                quillRef.current.setContents([]);
            }
        } catch (error) {
            console.error('AnnotationUI: Failed to save annotation:', error);
            handleShowToast('Failed to save annotation');
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

    const handleCloseSettings = (justImported?: boolean) => {
        if (justImported) {
            setJustImported(true);
        }
    };

    const handleBeforeImport = () => {
        setJustImported(true);
    };

    const handleResetJustImported = () => {
        setJustImported(false);
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

    const validAnnotations = useMemo(
        () => annotations.filter(
            (annotation) => annotation.id && annotation.author && annotation.content
        ),
        [annotations]
    );

    const onDeleteCommentProp = did ? handleDeleteComment : undefined;
    console.log('AnnotationUI: Passing onDeleteComment to AnnotationList - did:', did, 'annotationsLoading:', annotationsLoading, 'onDeleteComment:', onDeleteCommentProp);

    console.log('AnnotationUI: Rendering with annotations:', validAnnotations, 'profiles:', profiles, 'loading:', annotationsLoading);

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
                        onCloseSettings={handleCloseSettings}
                        onBeforeImport={handleBeforeImport}
                        onResetJustImported={handleResetJustImported}
                        onShowToast={handleShowToast}
                    />
                </div>
            </div>
            <div className="annotation-input">
                <div ref={editorRef} className="quill-editor"></div>
                <button
                    onClick={handleSave}
                    className="annotation-save-button"
                    disabled={!annotationText.trim() || !did || !url || isUrlLoading}
                >
                    Save
                </button>
            </div>
            {isUrlLoading || annotationsLoading ? (
                <div className="loading-spinner">
                    <span>Loading annotations...</span>
                </div>
            ) : (
                <div className="annotation-list-wrapper">
                    {validAnnotations.length === 0 && (
                        <p>No annotations available for this page.</p>
                    )}
                    <MemoizedAnnotationList
                        annotations={validAnnotations}
                        profiles={profiles}
                        onDelete={handleDeleteAnnotation}
                        onDeleteComment={onDeleteCommentProp}
                        onSaveComment={did ? handleSaveComment : undefined}
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