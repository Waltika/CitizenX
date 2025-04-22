import React from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationUI from '../components/AnnotationUI';

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<AnnotationUI url="sidepanel" />);
} else {
    console.error('Root element not found');
}