import React, { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAnnotations } from '../hooks/useAnnotations';
import { AnnotationList } from './AnnotationList';
import './AnnotationUI.css';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles (bundle this in production)
import citizenxLogo from '../assets/citizenx-logo.png';
import { normalizeUrl } from "../utils/normalizeUrl";
export const AnnotationUI = ({ url, isPopupUrl }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations, profiles, error: annotationsError, loading: annotationsLoading, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = useAnnotations({ url, did });
    const [annotationText, setAnnotationText] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileHandle, setProfileHandle] = useState('');
    const [profilePicture, setProfilePicture] = useState(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [importIdentityData, setImportIdentityData] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportedIdentity, setExportedIdentity] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [passphraseModalOpen, setPassphraseModalOpen] = useState(null);
    const [importPassphrase, setImportPassphrase] = useState('');
    const editorRef = useRef(null);
    const quillRef = useRef(null);
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
        }
        else {
            console.log('AnnotationUI: Profile modal conditions - loading:', profileLoading, 'did:', did, 'profile:', profile);
        }
    }, [profileLoading, did, profile]);
    useEffect(() => {
        console.log('AnnotationUI: annotationsLoading changed:', annotationsLoading);
    }, [annotationsLoading]);
    const handleSave = async () => {
        if (annotationText.trim() && !isPopupUrl) {
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
            }
            else {
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
        setPassphraseModalOpen('export');
    };
    const handleExportWithPassphrase = async () => {
        if (!passphrase) {
            alert('Please enter a passphrase');
            return;
        }
        try {
            const identity = await exportIdentity(passphrase);
            setExportedIdentity(identity);
            setIsExportModalOpen(true);
            setPassphraseModalOpen(null);
            setPassphrase('');
            setIsSettingsOpen(false);
        }
        catch (err) {
            console.error('Failed to export identity:', err);
            alert(err.message || 'Failed to export identity');
        }
    };
    const handleImportIdentity = async () => {
        if (!importIdentityData.trim()) {
            alert('Please paste the identity data');
            return;
        }
        setPassphraseModalOpen('import');
    };
    const handleImportWithPassphrase = async () => {
        if (!importPassphrase) {
            alert('Please enter the passphrase');
            return;
        }
        try {
            await importIdentity(importIdentityData, importPassphrase);
            setImportIdentityData('');
            setImportPassphrase('');
            setPassphraseModalOpen(null);
            setIsSettingsOpen(false);
        }
        catch (err) {
            console.error('Failed to import identity:', err);
            alert(err.message || 'Failed to import identity');
        }
    };
    useEffect(() => {
        const setupChromeMessageListener = () => {
            const handleMessage = (message) => {
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
    return (React.createElement("div", { className: "annotation-ui-container" },
        profileError && React.createElement("div", { className: "error-text" }, profileError),
        annotationsError && React.createElement("div", { className: "error-text" }, annotationsError),
        React.createElement("div", { className: "connected-section" },
            React.createElement("div", { className: "connected-section-content" },
                React.createElement("div", { className: "connected-user-info" }, profile ? (React.createElement(React.Fragment, null,
                    profile.profilePicture && React.createElement("img", { src: profile.profilePicture, alt: "Profile", className: "profile-picture" }),
                    React.createElement("p", { className: "connected-text" },
                        "Connected: ",
                        profile.handle))) : (React.createElement("p", { className: "connected-text" }, "Not connected"))),
                React.createElement("div", { className: "settings-menu-container" },
                    React.createElement("button", { className: "settings-button", onClick: () => setIsSettingsOpen(!isSettingsOpen) }, "\u2699\uFE0F"),
                    isSettingsOpen && (React.createElement("div", { className: "settings-menu" }, !did ? (React.createElement("div", { className: "auth-section" },
                        React.createElement("button", { className: "authenticate-button", onClick: handleAuthenticate }, "Authenticate"),
                        React.createElement("div", { className: "import-section" },
                            React.createElement("textarea", { className: "import-textarea", value: importIdentityData, onChange: (e) => setImportIdentityData(e.target.value), placeholder: "Paste identity to import..." }),
                            React.createElement("button", { className: "import-button", onClick: handleImportIdentity, disabled: !importIdentityData.trim() }, "Import Identity")))) : (React.createElement(React.Fragment, null,
                        React.createElement("button", { className: "settings-menu-button", onClick: handleExportIdentity }, "Export Identity"),
                        React.createElement("button", { className: "settings-menu-button sign-out-button", onClick: handleSignOut }, "Sign Out")))))))),
        annotationsLoading && (React.createElement("div", { className: "loading-spinner" },
            React.createElement("span", null, "Loading annotations..."))),
        !isPopupUrl && (React.createElement("div", { className: "annotation-input" },
            React.createElement("div", { ref: editorRef, className: "quill-editor" }),
            React.createElement("button", { onClick: handleSave, className: "annotation-save-button", disabled: !annotationText.trim() || !did || annotationsLoading }, "Save"))),
        React.createElement("div", { className: "annotation-list-wrapper" },
            React.createElement(AnnotationList, { annotations: annotations, profiles: profiles, onDelete: handleDeleteAnnotation, onSaveComment: isPopupUrl || !did || annotationsLoading ? undefined : handleSaveComment })),
        React.createElement("div", { className: "logo-container" },
            React.createElement("a", { href: "https://citizenx.app", target: "_blank", rel: "noopener noreferrer" },
                React.createElement("img", { src: citizenxLogo, alt: "CitizenX Logo", className: "citizenx-logo" }))),
        isProfileModalOpen && (React.createElement("div", { className: "profile-modal" },
            React.createElement("h2", { className: "profile-modal-title" }, profile ? 'Update Profile' : 'Create Profile'),
            React.createElement("input", { type: "text", value: profileHandle, onChange: (e) => setProfileHandle(e.target.value), placeholder: "Enter your handle", className: "profile-modal-input" }),
            React.createElement("input", { type: "file", accept: "image/*", onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setProfilePicture(reader.result);
                        };
                        reader.readAsDataURL(file);
                    }
                }, className: "profile-modal-file-input" }),
            profilePicture && React.createElement("img", { src: profilePicture, alt: "Preview", className: "profile-modal-preview" }),
            React.createElement("div", { className: "profile-modal-buttons" },
                React.createElement("button", { onClick: handleProfileSave, className: "profile-modal-save-button" }, "Save Profile"),
                React.createElement("button", { onClick: () => setIsProfileModalOpen(false), className: "profile-modal-cancel-button" }, "Cancel")))),
        isExportModalOpen && (React.createElement("div", { className: "export-modal" },
            React.createElement("h2", { className: "export-modal-title" }, "Export Identity"),
            React.createElement("textarea", { className: "export-modal-textarea", value: exportedIdentity, readOnly: true }),
            React.createElement("button", { className: "export-modal-button", onClick: () => navigator.clipboard.writeText(exportedIdentity) }, "Copy to Clipboard"),
            React.createElement("button", { className: "export-modal-close-button", onClick: () => setIsExportModalOpen(false) }, "Close"))),
        passphraseModalOpen && (React.createElement("div", { className: "profile-modal" },
            React.createElement("h2", { className: "profile-modal-title" }, passphraseModalOpen === 'export' ? 'Export Identity' : 'Import Identity'),
            React.createElement("input", { type: "password", value: passphraseModalOpen === 'export' ? passphrase : importPassphrase, onChange: (e) => {
                    if (passphraseModalOpen === 'export') {
                        setPassphrase(e.target.value);
                    }
                    else {
                        setImportPassphrase(e.target.value);
                    }
                }, placeholder: "Enter passphrase", className: "profile-modal-input" }),
            React.createElement("div", { className: "profile-modal-buttons" },
                React.createElement("button", { onClick: passphraseModalOpen === 'export' ? handleExportWithPassphrase : handleImportWithPassphrase, className: "profile-modal-save-button" }, passphraseModalOpen === 'export' ? 'Export' : 'Import'),
                React.createElement("button", { onClick: () => {
                        setPassphraseModalOpen(null);
                        setPassphrase('');
                        setImportPassphrase('');
                    }, className: "profile-modal-cancel-button" }, "Cancel"))))));
};
