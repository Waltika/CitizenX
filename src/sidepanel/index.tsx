// src/sidepanel/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AnnotationUI from '../components/AnnotationUI';
import './index.css';

const App: React.FC = () => {
    const [currentUrl, setCurrentUrl] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
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

        fetchCurrentTabUrl();

        const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            if (changeInfo.url && tab.active) {
                setCurrentUrl(changeInfo.url);
            }
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);

        const onTabActivated = () => {
            fetchCurrentTabUrl();
        };
        chrome.tabs.onActivated.addListener(onTabActivated);

        return () => {
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            chrome.tabs.onActivated.removeListener(onTabActivated);
        };
    }, []);

    const toggleMinimize = () => {
        setIsMinimized((prev) => !prev);
    };

    if (currentUrl === null) {
        return <div>Loading...</div>;
    }

    return (
        <div className={`sidepanel-container ${isMinimized ? 'minimized' : ''}`}>
            <button className="toggle-button" onClick={toggleMinimize}>
                {isMinimized ? '▶' : '◀'}
            </button>
            <div className="sidepanel-content">
                {!isMinimized && <AnnotationUI url={currentUrl} />}
            </div>
        </div>
    );
};

const container = document.createElement('div');
container.id = 'sidepanel-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<App />);