// src/components/AnnotationUI.tsx
import React, { useState } from 'react';
import { useOrbitDB } from '../hooks/useOrbitDB';
import { useAnnotations } from '../hooks/useAnnotations';
import useAuth from '../hooks/useAuth';
import AnnotationList from './AnnotationList';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const [annotation, setAnnotation] = useState('');
    const { did, authenticate, signOut, exportIdentity, importIdentity, error: authError } = useAuth();
    const [exportedIdentity, setExportedIdentity] = useState('');
    const [importData, setImportData] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [importPassphrase, setImportPassphrase] = useState('');
    const [importError, setImportError] = useState('');
    const [exportError, setExportError] = useState(''); // Local state for export errors

    const isPopupUrl = url.startsWith('chrome-extension://');
    const { db, error: dbError } = isPopupUrl ? { db: null, error: null } : useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = isPopupUrl
        ? { annotations: [], error: null, handleSaveAnnotation: async () => {}, handleDeleteAnnotation: async () => {} }
        : useAnnotations(url, db, did);

    const error = authError || dbError || annotationsError;

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

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
            {did ? (
                <div style={{ marginBottom: '8px' }}>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>
                        Connected: {did.slice(0, 6)}...{did.slice(-4)}
                    </p>
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
            <AnnotationList annotations={annotations} onDelete={handleDeleteAnnotation} />
        </div>
    );
};

export default AnnotationUI;