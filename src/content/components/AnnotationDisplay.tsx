// src/content/components/AnnotationDisplay.tsx
import React, { useState, useEffect } from 'react';
import { annotationService } from '../../background/services/annotations';
import { normalizeUrl } from '../../background/utils/urlNormalizer';
import '../styles/components/AnnotationDisplay.module.css';

interface AnnotationDisplayProps {
    url: string;
}

export const AnnotationDisplay: React.FC<AnnotationDisplayProps> = ({ url }) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const normalizedUrl = normalizeUrl(url);
        annotationService.getAnnotations(normalizedUrl).then(setAnnotations);
    }, [url]);

    return (
        <div className="annotation-display">
            <button onClick={() => setIsVisible(!isVisible)}>
                {isVisible ? 'Hide Annotations' : 'Show Annotations'}
            </button>
            {isVisible && (
                <div className="annotation-list">
                    {annotations.length === 0 ? (
                        <p>No annotations for this page.</p>
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