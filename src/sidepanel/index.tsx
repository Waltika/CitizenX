// src/sidepanel/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationUI from '../components/AnnotationUI';

const App: React.FC = () => {
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);

    useEffect(() => {
        // Function to fetch the current tab's URL
        const fetchCurrentTabUrl = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.url) {
                    setCurrentUrl(tabs[0].url);
                } else {
                    console.error('Failed to get current tab URL');
                    setCurrentUrl('');
                }
            });
        };

        // Fetch the initial URL
        fetchCurrentTabUrl();

        // Listen for tab updates (e.g., URL changes)
        const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            if (changeInfo.url && tab.active) {
                setCurrentUrl(changeInfo.url);
            }
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);

        // Listen for tab activation (e.g., switching tabs)
        const onTabActivated = () => {
            fetchCurrentTabUrl();
        };
        chrome.tabs.onActivated.addListener(onTabActivated);

        // Cleanup listeners on unmount
        return () => {
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            chrome.tabs.onActivated.removeListener(onTabActivated);
        };
    }, []);

    // Show a loading message until the URL is fetched
    if (currentUrl === null) {
        return <div>Loading...</div>;
    }

    return <AnnotationUI url={currentUrl} />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error('Root element not found');
}