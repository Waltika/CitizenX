// src/sidepanel/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';

const App: React.FC = () => {
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch the current tab's URL with a timeout
        const fetchUrl = async () => {
            try {
                const response = await new Promise<{ url?: string; error?: string }>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout: No response from background script'));
                    }, 5000); // 5-second timeout

                    chrome.runtime.sendMessage({ action: 'getCurrentTabUrl' }, (res: { url?: string; error?: string }) => {
                        clearTimeout(timeout);
                        resolve(res);
                    });
                });

                if (response && response.url) {
                    console.log('index.tsx: Fetched current tab URL:', response.url);
                    setUrl(response.url);
                } else {
                    console.error('index.tsx: No URL received from background script:', response?.error || 'Unknown error');
                    setError('No URL received');
                    setUrl(''); // Fallback to empty string
                }
            } catch (err) {
                console.error('index.tsx: Failed to get current tab URL:', err);
                setError('Failed to get current tab URL');
                setUrl(''); // Fallback to empty string
            }
        };

        fetchUrl();
    }, []);

    if (error) {
        return <div style={{ padding: '1rem', color: '#e11d48' }}>{error}</div>;
    }

    if (url === null) {
        return <div style={{ padding: '1rem' }}>Loading...</div>;
    }

    return <AnnotationUI url={url} />;
};

// Render the app
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root container not found');
}
const root = createRoot(container);
root.render(<App />);