// src/components/AnnotationUI.tsx (updated)
import React, { useState, useEffect } from 'react';
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
    const [newHandle, setNewHandle] = useState('');
    const [newProfilePicture, setNewProfilePicture] = useState('');

    const isPopupUrl = url.startsWith('chrome-extension://');
    const { db, error: dbError } = isPopupUrl ? { db: null, error: null } : useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = isPopupUrl
        ? { annotations: [], error: null, handleSaveAnnotation: async () => {}, handleDeleteAnnotation: async () => {} }
        : useAnnotations(url, db, did);

    const error = authError || dbError || annotationsError || profilesError;

    useEffect(() => {
        if (did && !profile) {
            setIsProfileModalOpen(true); // Prompt to set profile if none exists
        }
    }, [did, profile]);

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

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
            {did ? (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        {profile && profile.profilePicture && (
                            <img
                                src={profile.profilePicture}
                                alt="Profile"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', marginRight: '8px' }}
                            />
                        )}
                        <p style={{ margin: '0', fontSize: '0.9rem' }}>
                            Connected: {profile?.handle || 'Set your handle'}
                        </p>
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                background: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                            }}
                        >
                            Edit Profile
                        </button>
                    </div>
                    <button
                        onClick={signOut}
                        style={{
                            padding: '5px 10px',
                            background: '#ff0000',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginBottom: '8px',
                        }}
                    >
                        Sign Out
                    </button>
                    <div style={{ marginBottom: '8px' }}>
                        <input
                            type="password"
                            placeholder="Enter passphrase to export"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            style={{ width: '100%', marginBottom: '4px' }}
                        />
                        <button
                            onClick={handleExport}
                            style={{
                                padding: '5px 10px',
                                background: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            Export Identity
                        </button>
                        {exportError && <p style={{ color: 'red', margin: '4px 0 0 0', fontSize: '0.8rem' }}>{exportError}</p>}
                        {exportedIdentity && (
                            <textarea
                                value={exportedIdentity}
                                readOnly
                                style={{ width: '100%', height: '60px', marginTop: '4px', fontSize: '0.8rem' }}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '8px' }}>
                    <button
                        onClick={authenticate}
                        style={{
                            padding: '5px 10px',
                            background: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginBottom: '8px',
                            width: '100%',
                        }}
                    >
                        Authenticate
                    </button>
                    <div>
                        <textarea
                            value={importData}
                            onChange={(e) => setImportData(e.target.value)}
                            placeholder="Paste your exported identity here..."
                            style={{ width: '100%', height: '60px', marginBottom: '4px', fontSize: '0.8rem' }}
                        />
                        <input
                            type="password"
                            placeholder="Enter passphrase to import"
                            value={importPassphrase}
                            onChange={(e) => setImportPassphrase(e.target.value)}
                            style={{ width: '100%', marginBottom: '4px' }}
                        />
                        <button
                            onClick={handleImport}
                            style={{
                                padding: '5px 10px',
                                background: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            Import Identity
                        </button>
                        {importError && <p style={{ color: 'red', margin: '4px 0 0 0', fontSize: '0.8rem' }}>{importError}</p>}
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
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>
                        {profile ? 'Update Profile' : 'Set Profile'}
                    </h2>
                    <input
                        type="text"
                        placeholder="Enter your handle"
                        value={newHandle}
                        onChange={(e) => setNewHandle(e.target.value)}
                        style={{ width: '100%', marginBottom: '8px' }}
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
                                padding: '5px 10px',
                                background: '#28a745',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                            }}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(false)}
                            style={{
                                padding: '5px 10px',
                                background: '#ff0000',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {error && <p style={{ color: 'red', margin: '0 0 8px 0' }}>{error}</p>}
            <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                placeholder="Enter annotation..."
                style={{ width: '100%', height: '80px', marginBottom: '8px' }}
            />
            <button
                onClick={onSave}
                disabled={!db}
                style={{
                    padding: '5px 10px',
                    background: db ? '#28a745' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: db ? 'pointer' : 'not-allowed',
                    marginBottom: '16px',
                }}
            >
                Save
            </button>
            <AnnotationList annotations={annotations} profiles={profiles} onDelete={handleDeleteAnnotation} />
        </div>
    );
};

export default AnnotationUI;