// src/content/components/AnnotationCreate.tsx
import React, { useState } from 'react';
import { annotationService } from '../../background/services/annotations';

export const AnnotationCreate: React.FC<{ url: string; userId: string }> = ({ url, userId }) => {
    const [text, setText] = useState('');

    const handleSubmit = async () => {
        try {
            await annotationService.addAnnotation({
                id: `test-${Date.now()}`,
                url,
                text,
                userId,
                timestamp: Date.now()
            });
            setText('');
        } catch (err) {
            console.error('Failed to add annotation:', err);
        }
    };

    return (
        <div className="annotation-create">
      <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your annotation"
      />
            <button onClick={handleSubmit}>Add Annotation</button>
        </div>
    );
};