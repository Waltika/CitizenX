// src/sidepanel/components/Annotation/List.tsx
import React from 'react';

interface AnnotationListProps {
    userId: string;
    url: string;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ userId, url }) => {
    return (
        <div className="annotation-list">
            <h3>Annotations</h3>
            <p>No annotations available.</p>
        </div>
    );
};

export { AnnotationList };