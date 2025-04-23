// src/components/AnnotationUI.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useOrbitDB } from '../hooks/useOrbitDB';
import { useAnnotations } from '../hooks/useAnnotations';
import { useUserProfiles } from '../hooks/useUserProfiles';
import useAuth from '../hooks/useAuth';
import AnnotationList from './AnnotationList';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const [annotation, setAnnotation] = useState('');
    const { did, profile, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile, error: authError } = useAuth();
    const { profiles, error: profilesError } = useUserProfiles(did);
    const [exportedIdentity, setExportedIdentity] = useState('');
    const [importData, setImportData] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [importPassphrase, setImportPassphrase] = useState('');
    const [importError, setImportError] = useState('');
    const [exportError, setExportError] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false); // New state for export modal
    const [newHandle, setNewHandle] = useState('');
    const [newProfilePicture, setNewProfilePicture] = useState('');
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const settingsMenuRef = useRef<HTMLDivElement>(null);

    const isPopupUrl = url.startsWith('chrome-extension://');
    const { db, error: dbError } = isPopupUrl ? { db: null, error: null } : useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = isPopupUrl
        ? { annotations: [], error: null, handleSaveAnnotation: async () => {}, handleDeleteAnnotation: async () => {} }
        : useAnnotations(url, db, did);

    const error = authError || dbError || annotationsError || profilesError;

    useEffect(() => {
        if (did && !profile) {
            setIsProfileModalOpen(true);
        }
    }, [did, profile]);

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
        await handleSaveAnnotation(annotation);
        setAnnotation('');
    };

    const handleExport = async () => {
        try {
            if (!passphrase) {
                setExportError('Please enter a passphrase to export your identity');
                return;
            }
            const identityData = await exportIdentity(passphrase);
            setExportedIdentity(identityData);
            setExportError('');
        } catch (err) {
            setExportError((err as Error).message);
        }
    };

    const handleImport = async () => {
        try {
            if (!importData || !importPassphrase) {
                setImportError('Please enter the identity data and passphrase');
                return;
            }
            await importIdentity(importData, importPassphrase);
            setImportData('');
            setImportPassphrase('');
            setImportError('');
            setExportedIdentity('');
        } catch (err) {
            setImportError((err as Error).message);
        }
    };

    const handleProfileSubmit = async () => {
        try {
            if (!newHandle || !newProfilePicture) {
                setExportError('Please provide a handle and profile picture');
                return;
            }
            if (profile) {
                await updateProfile(newHandle, newProfilePicture);
            } else {
                await createProfile(newHandle, newProfilePicture);
            }
            setIsProfileModalOpen(false);
            setNewHandle('');
            setNewProfilePicture('');
            setIsSettingsMenuOpen(false);
        } catch (err) {
            setExportError((err as Error).message);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setNewProfilePicture(event.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSettingsMenu = () => {
        setIsSettingsMenuOpen((prev) => !prev);
    };

    const openExportModal = () => {
        setIsSettingsMenuOpen(false);
        setIsExportModalOpen(true);
        setPassphrase(''); // Reset passphrase
        setExportedIdentity(''); // Reset exported identity
        setExportError(''); // Reset error
    };

    return (
        <div style={{ padding: '16px', maxWidth: '300px', backgroundColor: '#f5f7fa', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 16px 0', color: '#333' }}>
                CitizenX Annotations
            </h1>
            {did ? (
                <div style={{ marginBottom: '16px', backgroundColor: '#fff', padding: '8px', borderRadius: '5px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {profile && profile.profilePicture && (
                                <img
                                    src={profile.profilePicture}
                                    alt="Profile"
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '8px' }}
                                />
                            )}
                            <p style={{ margin: '0', fontSize: '0.9rem', color: '#333' }}>
                                Connected: {profile?.handle || 'Set your handle'}
                            </p>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={toggleSettingsMenu}
                                style={{
                                    padding: '4px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                aria-label="Settings"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#2c7a7b"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            {isSettingsMenuOpen && (
                                <div
                                    ref={settingsMenuRef}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '5px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        onClick={() => setIsProfileModalOpen(true)}
                                        style={{
                                            display: 'block',
                                            padding: '8px 16px',
                                            background: 'none',
                                            border: 'none',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            color: '#333',
                                            fontSize: '0.9rem',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f7fa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={openExportModal}
                                        style={{
                                            display: 'block',
                                            padding: '8px 16px',
                                            background: 'none',
                                            border: 'none',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            color: '#333',
                                            fontSize: '0.9rem',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f7fa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        Export Identity
                                    </button>
                                    <button
                                        onClick={signOut}
                                        style={{
                                            display: 'block',
                                            padding: '8px 16px',
                                            background: 'none',
                                            border: 'none',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            color: '#f97316',
                                            fontSize: '0.9rem',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f7fa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '16px' }}>
                    <button
                        onClick={authenticate}
                        style={{
                            padding: '8px 16px',
                            background: '#2c7a7b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '0.9rem',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a999a')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2c7a7b')}
                    >
                        Authenticate
                    </button>
                    <div style={{ marginTop: '8px' }}>
                        <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder="Paste your exported identity here..."
                            style={{
                                width: '100%',
                                height: '60px',
                                marginBottom: '8px',
                                fontSize: '0.8rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '5px',
                                padding: '8px',
                                color: '#333',
                                backgroundColor: '#fff',
                            }}
                        />
                        <input
                            type="password"
                            placeholder="Enter passphrase to import"
                            value={importPassphrase}
                            onChange={(e) => setImportPassphrase(e.target.value)}
                            style={{
                                width: '100%',
                                marginBottom: '8px',
                                padding: '8px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '5px',
                                fontSize: '0.9rem',
                                color: '#333',
                                backgroundColor: '#fff',
                            }}
                        />
                        <button
                            onClick={handleImport}
                            style={{
                                padding: '8px 16px',
                                background: '#2c7a7b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                width: '100%',
                                fontSize: '0.9rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a999a')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2c7a7b')}
                        >
                            Import Identity
                        </button>
                        {importError && <p style={{ color: '#e11d48', margin: '4px 0 0 0', fontSize: '0.8rem' }}>{importError}</p>}
                    </div>
                </div>
            )}
            {isProfileModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#fff',
                    padding: '16px',
                    borderRadius: '5px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: '#333' }}>
                        {profile ? 'Update Profile' : 'Set Profile'}
                    </h2>
                    <input
                        type="text"
                        placeholder="Enter your handle"
                        value={newHandle}
                        onChange={(e) => setNewHandle(e.target.value)}
                        style={{
                            width: '100%',
                            marginBottom: '8px',
                            padding: '8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '5px',
                            fontSize: '0.9rem',
                            color: '#333',
                            backgroundColor: '#fff',
                        }}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ width: '100%', marginBottom: '8px' }}
                    />
                    {newProfilePicture && (
                        <img
                            src={newProfilePicture}
                            alt="Preview"
                            style={{ width: '50px', height: '50px', borderRadius: '50%', marginBottom: '8px' }}
                        />
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleProfileSubmit}
                            style={{
                                padding: '8px 16px',
                                background: '#2c7a7b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a999a')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2c7a7b')}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            style={{
                                padding: '8px 16px',
                                background: '#f97316',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fb923c')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {isExportModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#fff',
                    padding: '16px',
                    borderRadius: '5px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', color: '#333' }}>
                        Export Identity
                    </h2>
                    <input
                        type="password"
                        placeholder="Enter passphrase to export"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        style={{
                            width: '100%',
                            marginBottom: '8px',
                            padding: '8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '5px',
                            fontSize: '0.9rem',
                            color: '#333',
                            backgroundColor: '#fff',
                        }}
                    />
                    <button
                        onClick={handleExport}
                        style={{
                            padding: '8px 16px',
                            background: '#2c7a7b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '0.9rem',
                            marginBottom: '8px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a999a')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2c7a7b')}
                    >
                        Export
                    </button>
                    {exportError && <p style={{ color: '#e11d48', margin: '4px 0 8px 0', fontSize: '0.8rem' }}>{exportError}</p>}
                    {exportedIdentity && (
                        <textarea
                            value={exportedIdentity}
                            readOnly
                            style={{
                                width: '100%',
                                height: '60px',
                                marginBottom: '8px',
                                fontSize: '0.8rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '5px',
                                padding: '8px',
                                color: '#333',
                                backgroundColor: '#fff',
                            }}
                        />
                    )}
                    <button
                        onClick={() => setIsExportModalOpen(false)}
                        style={{
                            padding: '8px 16px',
                            background: '#f97316',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '0.9rem',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fb923c')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
                    >
                        Close
                    </button>
                </div>
            )}
            {error && <p style={{ color: '#e11d48', margin: '0 0 8px 0', fontSize: '0.8rem' }}>{error}</p>}
            <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                placeholder="Enter annotation..."
                style={{
                    width: '100%',
                    height: '80px',
                    marginBottom: '8px',
                    fontSize: '0.9rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '5px',
                    padding: '8px',
                    color: '#333',
                    backgroundColor: '#fff',
                }}
            />
            <button
                onClick={onSave}
                disabled={!db}
                style={{
                    padding: '8px 16px',
                    background: db ? '#2c7a7b' : '#d1d5db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: db ? 'pointer' : 'not-allowed',
                    marginBottom: '16px',
                    width: '100%',
                    fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => db && (e.currentTarget.style.backgroundColor = '#4a999a')}
                onMouseLeave={(e) => db && (e.currentTarget.style.backgroundColor = '#2c7a7b')}
            >
                Save
            </button>
            <AnnotationList annotations={annotations} profiles={profiles} onDelete={handleDeleteAnnotation} />
        </div>
    );
};

export default AnnotationUI;