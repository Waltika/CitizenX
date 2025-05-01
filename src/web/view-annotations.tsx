// src/web/view-annotations.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';

const { annotationId, targetUrl } = window.CitizenX || {};

if (annotationId && targetUrl) {
    const container = document.getElementById('annotation-ui');
    if (container) {
        const root = createRoot(container);
        root.render(
            <AnnotationUI
                url={targetUrl}
                isPopupUrl={false}
            />
        );
    } else {
        console.error('Annotation UI container not found');
    }
} else {
    console.error('Required parameters (annotationId, targetUrl) not found');
}