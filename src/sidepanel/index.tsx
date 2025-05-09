import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AnnotationUI } from '../components/AnnotationUI';
import { storage } from '../storage/StorageRepository';
import ErrorBoundary from '../components/ErrorBoundary'; // Import the ErrorBoundary

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
    const [tabId, setTabId] = useState<number | undefined>(undefined);
    const [isUrlLoading, setIsUrlLoading] = useState<boolean>(true);
    const [storageInitialized, setStorageInitialized] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCurrentTabUrl = async () => {
        try {
            setIsUrlLoading(true);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const newUrl = tab?.url || '';
            const newTabId = tab?.id;
            if (!newUrl || newUrl.startsWith('chrome://')) {
                console.log('index.tsx: Skipping invalid or restricted URL:', newUrl);
                setUrl('');
                setTabId(undefined);
                setIsUrlLoading(false);
                return;
            }
            console.log('index.tsx: Fetched current tab URL:', newUrl, 'with tabId:', newTabId);
            setUrl(newUrl);
            setTabId(newTabId);
            setIsUrlLoading(false);
            setError(null);
        } catch (error: any) {
            console.error('index.tsx: Failed to fetch current tab URL:', error);
            setUrl('');
            setTabId(undefined);
            setIsUrlLoading(false);
            setError('Failed to fetch tab URL: ' + (error.message || 'Unknown error'));
        }
    };

    const debouncedFetchCurrentTabUrl = debounce(fetchCurrentTabUrl, 2000); // Increased to 2000ms for stability

    useEffect(() => {
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
                    setStorageInitialized(true);
                    chrome.storage.local.set({ storage_initialized: true });
                    setError('Storage initialization failed: ' + (error.message || 'Unknown error'));
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

    return (
        <div className="app-container">
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={fetchCurrentTabUrl}>Retry</button>
                </div>
            )}
            <ErrorBoundary>
                <AnnotationUI url={url} isUrlLoading={isUrlLoading} tabId={tabId} />
            </ErrorBoundary>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);