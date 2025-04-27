// src/sidepanel/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

const App: React.FC = () => {
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPopupUrl, setIsPopupUrl] = useState<boolean>(false);

    const fetchCurrentTabUrl = async () => {
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
                const normalizedUrl = normalizeUrl(response.url);
                if (normalizedUrl) {
                    setUrl(normalizedUrl);
                    // Only treat chrome-extension:// URLs as popup URLs
                    setIsPopupUrl(response.url.startsWith('chrome-extension://'));
                } else {
                    setError('Failed to normalize URL');
                    setUrl('');
                    setIsPopupUrl(true);
                }
            } else {
                console.error('index.tsx: No URL received from background script:', response?.error || 'Unknown error');
                setError('No URL received');
                setUrl('');
                setIsPopupUrl(true);
            }
        } catch (err) {
            console.error('index.tsx: Failed to get current tab URL:', err);
            setError('Failed to get current tab URL');
            setUrl('');
            setIsPopupUrl(true);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchCurrentTabUrl();

        // Listen for tab changes
        chrome.tabs.onActivated.addListener(() => {
            console.log('index.tsx: Tab activated, fetching new URL');
            fetchCurrentTabUrl();
        });

        // Listen for window focus changes
        chrome.windows.onFocusChanged.addListener((windowId) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) return; // Ignore if no window is focused
            console.log('index.tsx: Window focus changed, fetching new URL');
            fetchCurrentTabUrl();
        });

        // Listen for tab updates (e.g., URL changes in the same tab)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url) {
                console.log('index.tsx: Tab URL updated, fetching new URL');
                fetchCurrentTabUrl();
            }
        });

        // Cleanup listeners on unmount
        return () => {
            // Note: Chrome API listeners can't be removed directly in the extension context,
            // but they will be cleaned up when the side panel is closed.
        };
    }, []);

    if (error) {
        return <div style={{ padding: '1rem', color: '#e11d48' }}>{error}</div>;
    }

    if (url === null) {
        return <div style={{ padding: '1rem' }}>Loading...</div>;
    }

    return <AnnotationUI url={url} isPopupUrl={isPopupUrl} />;
};

// Render the app
const container = document.getElementById('root');
if (!container) {
    throw new Error('Root container not found');
}
const root = createRoot(container);
root.render(<App />);