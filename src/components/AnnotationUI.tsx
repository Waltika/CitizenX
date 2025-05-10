import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAnnotations } from '../hooks/useAnnotations';
import { AnnotationList } from './AnnotationList';
import { SettingsPanel } from './SettingsPanel';
import { Toast } from './Toast';
import { Annotation, Comment } from '@/types';
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
import CameraIcon from '../assets/CameraIcon.svg'; // Import the SVG as a React component
import { normalizeUrl } from "../shared/utils/normalizeUrl";

interface AnnotationUIProps {
    url: string;
    isUrlLoading: boolean;
    tabId?: number;
}

interface PendingComment {
    tempId: string;
    annotationId: string;
    content: string;
    timestamp: number;
}

export const AnnotationUI: React.FC<AnnotationUIProps> = ({ url, isUrlLoading, tabId: originalTabId }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations: rawAnnotations, profiles, error: annotationsError, loading: annotationsLoading, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment: originalHandleSaveComment, handleDeleteComment } = useAnnotations({ url, did, tabId: originalTabId });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);
    const [justImported, setJustImported] = useState(false);
    const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
    const [captureScreenshot, setCaptureScreenshot] = useState<boolean>(true);

    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        console.log('AnnotationUI: Initializing Quill editor');
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
        console.log('AnnotationUI: Checking profile state - profileLoading:', profileLoading, 'did:', did, 'justImported:', justImported);
        if (!profileLoading && did && !justImported) {
            if (!profile || !profile.handle) {
                setIsProfileModalOpen(true);
            }
        }
    }, [profileLoading, did, profile, justImported]);

    useEffect(() => {
        console.log('AnnotationUI: URL changed, clearing pending comments - url:', url);
        setPendingComments([]);
    }, [url]);

    const deduplicateComments = useCallback((annotations: Annotation[]) => {
        console.log('AnnotationUI: Deduplicating comments for annotations:', annotations.length);
        return annotations.map(annotation => {
            if (!annotation.comments) return annotation;
            const seenComments = new Map<string, any>();
            const uniqueComments = annotation.comments.filter((comment: Comment) => {
                if (!comment || !comment.id) return false;

                const pendingMatch = pendingComments.find(pending =>
                    pending.annotationId === annotation.id &&
                    pending.content === comment.content &&
                    Math.abs(pending.timestamp - comment.timestamp) < 1000
                );

                if (pendingMatch) return false;

                if (seenComments.has(comment.id)) return false;

                const key = `${comment.content}-${comment.timestamp}`;
                if (seenComments.has(key)) return false;

                seenComments.set(comment.id, comment);
                seenComments.set(key, comment);
                return true;
            });

            return { ...annotation, comments: uniqueComments };
        });
    }, [pendingComments]);

    const validAnnotations = useMemo(() => {
        console.log('AnnotationUI: Computing validAnnotations - rawAnnotations:', rawAnnotations.length);
        const deduplicated = deduplicateComments(rawAnnotations);
        return deduplicated
            .filter((annotation) => annotation.id && annotation.author && annotation.content)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [rawAnnotations, deduplicateComments]);

    const handleShowToast = useCallback((message: string) => {
        setToastMessage(message);
        setShowToast(true);
    }, []);

    const handleSaveComment = useCallback(async (annotationId: string, content: string) => {
        console.log('AnnotationUI: handleSaveComment called - annotationId:', annotationId, 'content:', content);
        const timestamp = Date.now();
        const tempCommentId = `temp-${timestamp}`;
        const pendingComment: PendingComment = {
            tempId: tempCommentId,
            annotationId,
            content,
            timestamp,
        };

        setPendingComments(prev => [...prev, pendingComment]);

        try {
            await originalHandleSaveComment(annotationId, content);
            setPendingComments(prev => prev.filter(pc => pc.tempId !== tempCommentId));
        } catch (error) {
            console.error('AnnotationUI: Failed to save comment:', error);
            setPendingComments(prev => prev.filter(pc => pc.tempId !== tempCommentId));
            throw error;
        }
    }, [originalHandleSaveComment]);

    const handleSave = useCallback(async () => {
        if (!annotationText.trim()) return;

        let validatedTabId: number | undefined = undefined; // Default to no screenshot
        if (captureScreenshot && typeof chrome !== 'undefined' && chrome.tabs && originalTabId) {
            try {
                const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
                    chrome.tabs.get(originalTabId, (tab) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(tab);
                        }
                    });
                });
                if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                    console.log('AnnotationUI: Screenshot capture enabled, validating tabId:', tab.id);
                    validatedTabId = tab.id;
                } else {
                    console.log('AnnotationUI: Cannot capture screenshot for this page');
                    handleShowToast('Cannot capture screenshot for this page');
                }
            } catch (error) {
                console.error('AnnotationUI: Failed to validate tabId:', error);
                handleShowToast('Failed to access tab for screenshot');
            }
        } else if (!captureScreenshot) {
            console.log('AnnotationUI: Screenshot capture disabled');
        } else if (!originalTabId) {
            console.log('AnnotationUI: No active tab available for screenshot');
            handleShowToast('No active tab available for screenshot');
        }

        try {
            console.log('AnnotationUI: Saving annotation - content:', annotationText, 'captureScreenshot:', captureScreenshot, 'validatedTabId:', validatedTabId);
            await handleSaveAnnotation(annotationText, validatedTabId, captureScreenshot);
            setAnnotationText('');
            if (quillRef.current) {
                quillRef.current.setContents([]);
            }
        } catch (error) {
            console.error('AnnotationUI: Failed to save annotation:', error);
            handleShowToast('Failed to save annotation');
        }
    }, [annotationText, originalTabId, handleSaveAnnotation, handleShowToast, captureScreenshot]);

    const toggleScreenshotCapture = useCallback(() => {
        setCaptureScreenshot((prev) => !prev);
    }, []);

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
            return () => {
                chrome.runtime.onMessage.removeListener(handleMessage);
            };
        };

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            return setupChromeMessageListener();
        }
    }, [url]);

    const onDeleteCommentProp = did ? handleDeleteComment : undefined;

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
                <div className="button-group">
                    <button
                        onClick={toggleScreenshotCapture}
                        className={`screenshot-toggle-button ${captureScreenshot ? 'active' : ''}`}
                        title="Capture the visible part of the annotated page"
                    >
                        <CameraIcon className="camera-icon" width="16" height="16" />
                        <span className="tooltip">Capture the visible part of the annotated page</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className="annotation-save-button"
                        disabled={!annotationText.trim() || !did || !url || isUrlLoading}
                    >
                        Save
                    </button>
                </div>
            </div>
            {isUrlLoading || annotationsLoading ? (
                <div className="loading-spinner">
                    <span>Loading annotations...</span>
                </div>
            ) : (
                <div className="annotation-list-wrapper">
                    {validAnnotations.length === 0 ? (
                        <div className="no-annotations-wrapper">
                            <p className="no-annotations-message">No annotations available for this page.</p>
                        </div>
                    ) : (
                        <AnnotationList
                            annotations={validAnnotations}
                            profiles={profiles}
                            onDelete={handleDeleteAnnotation}
                            onDeleteComment={onDeleteCommentProp}
                            onSaveComment={did ? handleSaveComment : undefined}
                            currentUrl={url}
                            onShowToast={handleShowToast}
                        />
                    )}
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