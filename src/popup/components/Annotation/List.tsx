// src/popup/components/Annotation/List.tsx
import React, { useState, useEffect } from 'react';
import { annotationService } from '../../../background/services/annotations';
import '../../styles/components/Annotation.module.css';

interface Annotation {
    id: string;
    url: string;
    normalizedUrl: string;
    text: string;
    userId: string;
    timestamp: number;
}

interface AnnotationListProps {
    url: string;
    userId: string;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ url, userId }) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [newAnnotation, setNewAnnotation] = useState('');

    useEffect(() => {
        annotationService.getAnnotations(url).then(setAnnotations);
    }, [url]);

    const handleAddAnnotation = async () => {
        if (newAnnotation.trim()) {
            await annotationService.addAnnotation(url, newAnnotation, userId);
            setNewAnnotation('');
            annotationService.getAnnotations(url).then(setAnnotations);
        }
    };

    return (
        <div className="annotation-list">
            <h2>Annotations</h2>
            <div className="annotation-form">
        <textarea
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            placeholder="Enter new annotation"
            rows={4}
        />
                <button onClick={handleAddAnnotation}>Add Annotation</button>
            </div>
            {annotations.length === 0 ? (
                <p>No annotations available.</p>
            ) : (
                <ul>
                    {annotations.map((annotation) => (
                        <li key={annotation.id}>
                            <strong>{annotation.userId}</strong>: {annotation.text}
                            <span> ({new Date(annotation.timestamp).toLocaleString()})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};