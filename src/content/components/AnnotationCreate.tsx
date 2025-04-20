// src/content/components/AnnotationCreate.tsx
import React, { useState } from 'react';
import { annotationService } from '../../background/services/annotations';
import { normalizeUrl } from '../../background/utils/urlNormalizer';
import '../styles/components/AnnotationCreate.module.css';

interface AnnotationCreateProps {
    url: string;
    userId: string;
}

export const AnnotationCreate: React.FC<AnnotationCreateProps> = ({ url, userId }) => {
    const [text, setText] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    const handleCreateAnnotation = async () => {
        if (text.trim()) {
            await annotationService.addAnnotation(url, text, userId);
            setText('');
            setIsVisible(false);
        }
    };

    return (
        <div className="annotation-create">
            <button onClick={() => setIsVisible(!isVisible)}>
                {isVisible ? 'Close' : 'Add Annotation'}
            </button>
            {isVisible && (
                <div className="annotation-form">
          <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your annotation"
              rows={4}
          />
                    <button onClick={handleCreateAnnotation}>Save Annotation</button>
                </div>
            )}
        </div>
    );
};