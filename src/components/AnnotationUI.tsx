// src/components/AnnotationUI.tsx
import React, { useState } from 'react';
import { useOrbitDB } from '../hooks/useOrbitDB';
import { useAnnotations } from '../hooks/useAnnotations';
import AnnotationList from './AnnotationList';

interface AnnotationUIProps {
    url: string;
}

const AnnotationUI: React.FC<AnnotationUIProps> = ({ url }) => {
    const [annotation, setAnnotation] = useState('');
    const { db, error: dbError } = useOrbitDB(url);
    const { annotations, error: annotationsError, handleSaveAnnotation, handleDeleteAnnotation } = useAnnotations(url, db);

    const error = dbError || annotationsError;

    const onSave = async () => {
        await handleSaveAnnotation(annotation);
        setAnnotation('');
    };

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
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