// src/popup/components/Annotation/List.tsx
import React, { useState, useEffect } from 'react';
import { annotationService } from '../../../background/services/annotations';
import { normalizeUrl } from '../../../background/utils/urlNormalizer';
import styles from '../../styles/components/Annotation.module.css';

interface AnnotationListProps {
    url: string;
    userId: string;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ url, userId }) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [newAnnotation, setNewAnnotation] = useState('');

    useEffect(() => {
        const normalizedUrl = normalizeUrl(url);
        annotationService.getAnnotations(normalizedUrl).then(setAnnotations);
    }, [url]);

    const handleAddAnnotation = async () => {
        if (newAnnotation.trim()) {
            await annotationService.addAnnotation(url, newAnnotation, userId);
            const normalizedUrl = normalizeUrl(url);
            const updatedAnnotations = await annotationService.getAnnotations(normalizedUrl);
            setAnnotations(updatedAnnotations);
            setNewAnnotation('');
        }
    };

    return (
        <div className={styles['annotation-list']}>
            <h2>Annotations</h2>
            <div>
        <textarea
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            placeholder="Add a new annotation"
            rows={3}
        />
                <button onClick={handleAddAnnotation}>Add Annotation</button>
            </div>
            {annotations.length === 0 ? (
                <p>No annotations yet.</p>
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

interface Annotation {
    id: string;
    url: string;
    normalizedUrl: string;
    text: string;
    userId: string;
    timestamp: number;
}