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
    const { walletAddress, connectWallet, signOut, error: authError } = useAuth();
    const { db, error: dbError } = useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = useAnnotations(
        url,
        db,
        walletAddress
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