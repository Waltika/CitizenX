import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';
import { storage } from '../storage/StorageRepository'; // Import the singleton instance

function App() {
    const [url, setUrl] = useState<string>('');
    const [annotations, setAnnotations] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [storageInitialized, setStorageInitialized] = useState<boolean>(false);
    const [isPopupUrl, setIsPopupUrl] = useState<boolean>(false);

    useEffect(() => {
        console.log('index.tsx: Initializing storage...');
        storage.initialize().then(() => {
            console.log('index.tsx: Storage initialized');
            setStorageInitialized(true);
        }).catch((error) => {
            console.error('index.tsx: Failed to initialize storage:', error);
        });

        const handleMessage = (message: any) => {
            if (message.url) {
                console.log('index.tsx: Fetched current tab URL:', message.url);
                setUrl(message.url);
                // Determine if the URL is a popup URL (e.g., chrome-extension:// or similar)
                const popupUrlPatterns = [
                    /^chrome-extension:\/\//,
                    /^chrome:\/\//,
                    /^about:\/\//,
                ];
                const isPopup = popupUrlPatterns.some((pattern) => pattern.test(message.url));
                setIsPopupUrl(isPopup);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        chrome.runtime.sendMessage({ action: 'getCurrentTabUrl' });

        const handleTabChange = () => {
            console.log('index.tsx: Tab activated, fetching new URL');
            chrome.runtime.sendMessage({ action: 'getCurrentTabUrl' });
        };

        const handleWindowFocus = () => {
            console.log('index.tsx: Window focus changed, fetching new URL');
            chrome.runtime.sendMessage({ action: 'getCurrentTabUrl' });
        };

        chrome.tabs.onActivated.addListener(handleTabChange);
        chrome.tabs.onUpdated.addListener(handleTabChange);
        chrome.windows.onFocusChanged.addListener(handleWindowFocus);

        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
            chrome.tabs.onActivated.removeListener(handleTabChange);
            chrome.tabs.onUpdated.removeListener(handleTabChange);
            chrome.windows.onFocusChanged.removeListener(handleWindowFocus);
        };
    }, []);

    useEffect(() => {
        if (!storageInitialized || !url) {
            console.log('useAnnotations: Waiting for storage to initialize or URL to be set');
            return;
        }

        console.log('useAnnotations: Fetching annotations for URL:', url);
        setLoading(true);
        storage.getAnnotations(url).then((fetchedAnnotations) => {
            console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);
            setAnnotations(fetchedAnnotations);

            const profilePromises = fetchedAnnotations.map((annotation: any) =>
                storage.getProfile(annotation.author).then((profile) => ({
                    did: annotation.author,
                    profile,
                }))
            );

            Promise.all(profilePromises).then((profileResults) => {
                const newProfiles = profileResults.reduce((acc: Record<string, any>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    }
                    return acc;
                }, {});
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
            }).finally(() => {
                setLoading(false);
            });
        }).catch((error) => {
            console.error('useAnnotations: Failed to fetch annotations:', error);
            setLoading(false);
        });
    }, [url, storageInitialized]);

    return (
        <AnnotationUI url={url} isPopupUrl={isPopupUrl} />
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);