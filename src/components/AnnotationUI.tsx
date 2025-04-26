// src/components/AnnotationUI.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useOrbitDB } from '../hooks/useOrbitDB';
import { useAnnotations } from '../hooks/useAnnotations';
import { useUserProfiles } from '../hooks/useUserProfiles';
import useAuth from '../hooks/useAuth';
import { useIdentityExportImport } from '../hooks/useIdentityExportImport';
import { useProfileModal } from '../hooks/useProfileModal';
import { AnnotationList } from './AnnotationList';
import './AnnotationUI.css';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const [annotation, setAnnotation] = useState('');
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const settingsMenuRef = useRef<HTMLDivElement>(null);

    const { did, profile, loading, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile, error: authError } = useAuth();
    const { profiles, error: profilesError } = useUserProfiles(did);

    const {
        exportedIdentity,
        importData,
        setImportData,
        passphrase,
        setPassphrase,
        importPassphrase,
        setImportPassphrase,
        importError,
        exportError,
        handleExport,
        handleImport,
    } = useIdentityExportImport({ exportIdentity, importIdentity });

    const {
        isProfileModalOpen,
        setIsProfileModalOpen,
        newHandle,
        setNewHandle,
        newProfilePicture,
        handleProfileSubmit,
        handleFileChange,
    } = useProfileModal({ profile, createProfile, updateProfile });

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const isPopupUrl = url.startsWith('chrome-extension://');
    const { db, error: dbError, isReady } = isPopupUrl ? { db: null, error: null, isReady: true } : useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment } = isPopupUrl
        ? { annotations: [], error: null, handleSaveAnnotation: async () => {}, handleDeleteAnnotation: async () => {}, handleSaveComment: async () => {} }
        : useAnnotations(url, db, did, isReady);

    const error = authError || dbError || annotationsError || profilesError;

    useEffect(() => {
        console.log('AnnotationUI: Checking profile modal conditions - loading:', loading, 'did:', did, 'profile:', profile);
        if (!loading && did && !profile) {
            console.log('AnnotationUI: Opening Update Profile modal');
            setIsProfileModalOpen(true);
        }
    }, [did, profile, loading, setIsProfileModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
                setIsSettingsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const onSave = async () => {
        try {
            await handleSaveAnnotation(annotation);
            setAnnotation('');
        } catch (err) {
            console.error('Failed to save annotation in AnnotationUI:', err);
        }
    };

    const toggleSettingsMenu = () => {
        setIsSettingsMenuOpen((prev) => !prev);
    };

    const openExportModal = () => {
        setIsSettingsMenuOpen(false);
        setIsExportModalOpen(true);
        setPassphrase('');
    };

    return (
        <div className="annotation-ui-container">
            {did ? (
                <div className="connected-section">
                    <div className="connected-section-content">
                        <div className="connected-user-info">
                            {profile && profile.profilePicture && (
                                <img
                                    src={profile.profilePicture}
                                    alt="Profile"
                                    className="profile-picture"
                                />
                            )}
                            <p className="connected-text">
                                Connected: {profile?.handle || 'Set your handle'}
                            </p>
                        </div>
                        <div className="settings-menu-container">
                            <button
                                onClick={toggleSettingsMenu}
                                className="settings-button"
                                aria-label="Settings"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="1.25rem"
                                    height="1.25rem"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#2c7a7b"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h-.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l-.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v-.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            {isSettingsMenuOpen && (
                                <div
                                    ref={settingsMenuRef}
                                    className="settings-menu"
                                >
                                    <button
                                        onClick={() => setIsProfileModalOpen(true)}
                                        className="settings-menu-button"
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={openExportModal}
                                        className="settings-menu-button"
                                    >
                                        Export Identity
                                    </button>
                                    <button
                                        onClick={signOut}
                                        className="settings-menu-button sign-out-button"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="authenticate-section">
                    <button
                        onClick={authenticate}
                        className="authenticate-button"
                    >
                        Authenticate
                    </button>
                    <div className="import-section">
            <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste your exported identity here..."
                className="import-textarea"
            />
                        <input
                            type="password"
                            placeholder="Enter passphrase to import"
                            value={importPassphrase}
                            onChange={(e) => setImportPassphrase(e.target.value)}
                            className="import-input"
                        />
                        <button
                            onClick={handleImport}
                            className="authenticate-button"
                        >
                            Import Identity
                        </button>
                        {importError && <p className="error-text">{importError}</p>}
                    </div>
                </div>
            )}
            {isProfileModalOpen && (
                <div className="profile-modal">
                    <h2 className="profile-modal-title">
                        {profile ? 'Update Profile' : 'Set Profile'}
                    </h2>
                    <input
                        type="text"
                        placeholder="Enter your handle"
                        value={newHandle}
                        onChange={(e) => setNewHandle(e.target.value)}
                        className="profile-modal-input"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="profile-modal-file-input"
                    />
                    {newProfilePicture && (
                        <img
                            src={newProfilePicture}
                            alt="Preview"
                            className="profile-modal-preview"
                        />
                    )}
                    <div className="profile-modal-buttons">
                        <button
                            onClick={handleProfileSubmit}
                            className="profile-modal-button profile-modal-save-button"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            className="profile-modal-button profile-modal-cancel-button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {isExportModalOpen && (
                <div className="export-modal">
                    <h2 className="export-modal-title">
                        Export Identity
                    </h2>
                    <input
                        type="password"
                        placeholder="Enter passphrase to export"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className="export-modal-input"
                    />
                    <button
                        onClick={handleExport}
                        className="export-modal-button"
                    >
                        Export
                    </button>
                    {exportError && <p className="error-text">{exportError}</p>}
                    {exportedIdentity && (
                        <textarea
                            value={exportedIdentity}
                            readOnly
                            className="export-modal-textarea"
                        />
                    )}
                    <button
                        onClick={() => setIsExportModalOpen(false)}
                        className="export-modal-close-button"
                    >
                        Close
                    </button>
                </div>
            )}
            {error && <p className="error-text">{error}</p>}
            <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                placeholder="Enter annotation..."
                className="annotation-textarea"
            />
            <button
                onClick={onSave}
                disabled={!did || !db || !isReady}
                className="annotation-save-button"
            >
                Save
            </button>
            <AnnotationList
                annotations={annotations}
                profiles={profiles}
                onDelete={handleDeleteAnnotation}
                onSaveComment={did && db && isReady ? handleSaveComment : undefined}
            />
        </div>
    );
};

export default AnnotationUI;