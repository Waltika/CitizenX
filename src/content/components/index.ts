// src/content/index.ts
import React from 'react';
import { createRoot } from 'react-dom/client';
import { historyService } from '../../background/services/history';
import { AnnotationCreate } from './AnnotationCreate';

console.log('CitizenX content script initialized');

async function initialize() {
    const url = window.location.href;
    await historyService.addVisit(url);

    // Create container for React component
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<AnnotationCreate url={url} userId="test-user" />);
}

initialize().catch(console.error);