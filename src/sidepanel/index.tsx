import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const SidePanel: React.FC = () => {
    const [annotation, setAnnotation] = useState('');
    const [annotations, setAnnotations] = useState<string[]>([]);

    // Load annotations from localStorage on mount
    useEffect(() => {
        console.log('SidePanel mounted');
        const savedAnnotations = localStorage.getItem('citizenx-annotations');
        if (savedAnnotations) {
            setAnnotations(JSON.parse(savedAnnotations));
        }
    }, []);

    // Save annotation to localStorage and update list
    const handleSaveAnnotation = () => {
        if (annotation.trim()) {
            const newAnnotations = [...annotations, annotation.trim()];
            setAnnotations(newAnnotations);
            localStorage.setItem('citizenx-annotations', JSON.stringify(newAnnotations));
            setAnnotation('');
            console.log('Saved annotation from side panel:', annotation);
        }
    };

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
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
                    onClick={handleSaveAnnotation}
                    style={{
                        padding: '5px 10px',
                        background: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                    }}
                >
                    Save
                </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {annotations.length === 0 ? (
                    <p style={{ margin: 0, color: '#666' }}>No annotations yet.</p>
                ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {annotations.map((note, index) => (
                            <li
                                key={index}
                                style={{
                                    padding: '5px 0',
                                    borderBottom: '1px solid #eee',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {note}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);
console.log('Side panel initialized');