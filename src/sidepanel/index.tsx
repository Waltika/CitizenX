import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';
import { storage } from '../storage/StorageRepository'; // Import the singleton instance

function App() {
    const [url, setUrl] = useState<string>('');
    const [isUrlLoading, setIsUrlLoading] = useState<boolean>(true);
    const [annotations, setAnnotations] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [storageInitialized, setStorageInitialized] = useState<boolean>(false);

    const fetchCurrentTabUrl = async () => {
        try {
            setIsUrlLoading(true);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const newUrl = tab?.url || '';
            console.log('index.tsx: Fetched current tab URL:', newUrl);
            setUrl(newUrl);
            setIsUrlLoading(false);
        } catch (error) {
            console.error('index.tsx: Failed to fetch current tab URL:', error);
            setUrl('');
            setIsUrlLoading(false);
        }
    };

    useEffect(() => {
        console.log('index.tsx: Initializing storage...');
        storage.initialize().then(() => {
            console.log('index.tsx: Storage initialized');
            setStorageInitialized(true);
        }).catch((error) => {
            console.error('index.tsx: Failed to initialize storage:', error);
        });

        // Check for redirect on mount
        chrome.storage.local.get(['citizenx_redirect'], (result) => {
            const redirect = result.citizenx_redirect;
            if (redirect) {
                try {
                    const { annotationId, targetUrl } = JSON.parse(redirect);
                    console.log('index.tsx: Performing redirect to:', `${targetUrl}?annotationId=${annotationId}`);
                    chrome.tabs.create({ url: `${targetUrl}?annotationId=${annotationId}` });
                    chrome.storage.local.remove(['citizenx_redirect']);
                } catch (error) {
                    console.error('index.tsx: Failed to parse citizenx_redirect:', error);
                    chrome.storage.local.remove(['citizenx_redirect']); // Clean up invalid data
                }
            }
        });

        // Fetch initial URL
        fetchCurrentTabUrl();

        const handleTabChange = () => {
            console.log('index.tsx: Tab activated or updated, fetching new URL');
            fetchCurrentTabUrl();
        };

        const handleWindowFocus = (windowId: number) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) return;
            console.log('index.tsx: Window focus changed, fetching new URL');
            fetchCurrentTabUrl();
        };

        chrome.tabs.onActivated.addListener(handleTabChange);
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url || changeInfo.status === 'complete') {
                handleTabChange();
            }
        });
        chrome.windows.onFocusChanged.addListener(handleWindowFocus);

        return () => {
            chrome.tabs.onActivated.removeListener(handleTabChange);
            chrome.tabs.onUpdated.removeListener(handleTabChange);
            chrome.windows.onFocusChanged.removeListener(handleWindowFocus);
        };
    }, []);

    useEffect(() => {
        if (!storageInitialized || !url) {
            console.log('useAnnotations: Waiting for storage to initialize or URL to be set');
            setAnnotations([]); // Clear annotations when there's no URL
            setProfiles({}); // Clear profiles as well
            return;
        }

        console.log('useAnnotations: Fetching annotations for URL:', url);
        // Clear annotations and profiles before fetching new ones
        setAnnotations([]);
        setProfiles({});
        setLoading(true);

        // Force a re-render by awaiting a microtask
        const fetchAnnotations = async () => {
            // Wait for the state updates to be applied and the UI to re-render
            await new Promise(resolve => setTimeout(resolve, 0));

            try {
                const fetchedAnnotations = await storage.getAnnotations(url);
                console.log('useAnnotations: Fetched annotations:', fetchedAnnotations);
                setAnnotations(fetchedAnnotations);

                const profilePromises = fetchedAnnotations.map((annotation: any) =>
                    storage.getProfile(annotation.author).then((profile) => ({
                        did: annotation.author,
                        profile,
                    }))
                );

                const profileResults = await Promise.all(profilePromises);
                const newProfiles = profileResults.reduce((acc: Record<string, any>, { did, profile }) => {
                    if (profile) {
                        acc[did] = profile;
                    }
                    return acc;
                }, {});
                setProfiles((prev) => ({ ...prev, ...newProfiles }));
            } catch (error) {
                console.error('useAnnotations: Failed to fetch annotations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnotations();
    }, [url, storageInitialized]);

    return (
        <AnnotationUI url={url} isUrlLoading={isUrlLoading} />
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);