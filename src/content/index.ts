// src/content/index.ts
import React from 'react';
import { createRoot } from 'react-dom/client';
import { historyService } from '../background/services/history';
import { AnnotationCreate }  from './components/AnnotationCreate'
import { AnnotationDisplay } from './components/AnnotationDisplay';

console.log('CitizenX content script initialized');

async function initialize() {
    const url = window.location.href;
    await historyService.addVisit(url);

    // Create container for AnnotationCreate
    const createContainer = document.createElement('div');
    document.body.appendChild(createContainer);
    const createRootInstance = createRoot(createContainer);
    createRootInstance.render(<AnnotationCreate url={url} userId="test-user" />);

    // Create container for AnnotationDisplay
    const displayContainer = document.createElement('div');
    document.body.appendChild(displayContainer);
    const displayRoot = createRoot(displayContainer);
    displayRoot.render(<AnnotationDisplay url={url} />);

    // Create container for AuthWrapper
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<AuthWrapper url={url} />);
}

initialize().catch(console.error);