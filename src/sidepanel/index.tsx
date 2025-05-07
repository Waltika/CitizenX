import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';
import { storage } from '../storage/StorageRepository';

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}

function App() {
    const [url, setUrl] = useState<string>('');
    const [isUrlLoading, setIsUrlLoading] = useState<boolean>(true);
    const [annotations, setAnnotations] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
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

    // Debounced version of fetchCurrentTabUrl
    const debouncedFetchCurrentTabUrl = debounce(fetchCurrentTabUrl, 300);

    const fetchAnnotationsAndProfiles = async () => {
        if (!storageInitialized || !url) {
            console.log('useAnnotations: Waiting for storage to initialize or URL to be set');
            setAnnotations([]);
            setProfiles({});
            setError(null);
            return;
        }

        console.log('useAnnotations: Fetching annotations for URL:', url);
        setAnnotations([]);
        setProfiles({});
        setLoading(true);
        setError(null);

        const timeout = setTimeout(() => {
            setError('Request timed out. Please check your network and try again.');
            setLoading(false);
        }, 30000);

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
        } catch (error: any) {
            console.error('useAnnotations: Failed to fetch annotations:', error);
            setError('Failed to fetch annotations. Please check your network connection and try again.');
            const peerStatus = await storage.getPeerStatus();
            console.log('index.tsx: Peer status after error:', peerStatus);
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if storage was already initialized in a previous session
        chrome.storage.local.get(['storage_initialized'], (result) => {
            if (result.storage_initialized) {
                console.log('index.tsx: Storage already initialized in a previous session');
                setStorageInitialized(true);
                return;
            }

            console.log('index.tsx: Initializing storage...');
            storage.initialize()
                .then(() => {
                    console.log('index.tsx: Storage initialized');
                    setStorageInitialized(true);
                    chrome.storage.local.set({ storage_initialized: true });
                })
                .catch((error) => {
                    console.warn('index.tsx: Failed to initialize storage, proceeding with local storage:', error);
                    setStorageInitialized(true); // Proceed even if initialization fails
                    chrome.storage.local.set({ storage_initialized: true });
                });
        });

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
                    chrome.storage.local.remove(['citizenx_redirect']);
                }
            }
        });

        fetchCurrentTabUrl();

        const handleTabChange = () => {
            console.log('index.tsx: Tab activated or updated, fetching new URL');
            debouncedFetchCurrentTabUrl();
        };

        const handleWindowFocus = (windowId: number) => {
            if (windowId === chrome.windows.WINDOW_ID_NONE) return;
            console.log('index.tsx: Window focus changed, fetching new URL');
            debouncedFetchCurrentTabUrl();
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
        fetchAnnotationsAndProfiles();
    }, [url, storageInitialized]);

    return (
        <div className="app-container">
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={fetchAnnotationsAndProfiles}>Retry</button>
                </div>
            )}
            <AnnotationUI url={url} isUrlLoading={isUrlLoading} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);