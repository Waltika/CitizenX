// src/sidepanel/index.tsx
import React, { useEffect, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// Dynamically load the active-content script
const loadActiveContent = () => {
    return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        const timestamp = Date.now(); // Use a timestamp for uniqueness
        script.src = `https://waltika.github.io/citizenx/dist/active-content/index.js?v=${timestamp}`;
        script.async = true;
        script.onload = () => {
            console.log('Active-content script loaded:', script.src);
            resolve();
        };
        script.onerror = (err) => {
            console.error('Failed to load active-content script:', err);
            reject(err);
        };
        document.head.appendChild(script);
    });
};

// Lazy-load the AnnotationUI component (assumed to be part of active-content)
const AnnotationUI = React.lazy(() => import('./../components/AnnotationUI'));

const App = () => {
    useEffect(() => {
        loadActiveContent().catch((err) => {
            console.error('Error loading active-content:', err);
        });
    }, []);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AnnotationUI url={window.location.href} />
        </Suspense>
    );
};

// Render the app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);