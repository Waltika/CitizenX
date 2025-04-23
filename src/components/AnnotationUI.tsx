// src/components/AnnotationUI.tsx
import React, { useState } from 'react';
import { useOrbitDB } from '../hooks/useOrbitDB';
import { useAnnotations } from '../hooks/useAnnotations';
import useAuth from '../hooks/useAuth'; // Changed to default import
import AnnotationList from './AnnotationList';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const [annotation, setAnnotation] = useState('');
    const { walletAddress, connectWallet, signOut, error: authError } = useAuth();
    const { db, error: dbError } = useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = useAnnotations(
        url,
        db
    );

    const error = authError || dbError || annotationsError;

    const onSave = async () => {
        await handleSaveAnnotation(annotation);
        setAnnotation('');
    };

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
            {walletAddress ? (
                <div style={{ marginBottom: '8px' }}>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}>
                        Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
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
                        }}
                    >
                        Disconnect Wallet
                    </button>
                </div>
            ) : (
                <div style={{ marginBottom: '8px' }}>
                    <button
                        onClick={connectWallet}
                        style={{
                            padding: '5px 10px',
                            background: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                        }}
                    >
                        Connect Wallet
                    </button>
                </div>
            )}
            {error && (
                <p style={{ color: 'red', margin: '0 0 8px 0' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="Enter annotation..."
                    style={{
                        flex: 1,
                        padding: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                    }}
                />
                <button
                    onClick={onSave}
                    disabled={!db}
                    style={{
                        padding: '5px 10px',
                        background: db ? '#007bff' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: db ? 'pointer' : 'not-allowed',
                    }}
                >
                    Save
                </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <AnnotationList annotations={annotations} onDelete={handleDeleteAnnotation} />
            </div>
        </div>
    );
};

export default AnnotationUI;