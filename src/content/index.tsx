import React from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationUI from '../components/AnnotationUI';

function initializeContentScript() {
    try {
        const container = document.createElement('div');
        container.id = 'citizenx-content-root';
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(<AnnotationUI url={window.location.href} />);
        console.log('Content script initialized');
    } catch (error) {
        console.error('Content script initialization failed:', error);
    }
}

initializeContentScript();