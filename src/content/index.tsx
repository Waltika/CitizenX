import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

interface Annotation {
    id: string;
    url: string;
    text: string;
    userId: string;
    timestamp: number;
}

// Normalize URL (matches compiled output)
function normalizeUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'session', 'ref', 'fbclid', 'gclid'].forEach(param => params.delete(param));
        urlObj.search = params.toString();
        urlObj.pathname = urlObj.pathname.replace(/^\/(en|fr|de|es|it)\//i, '/');
        return urlObj.toString();
    } catch (error) {
        console.error('URL normalization failed:', error);
        return url;
    }
}

// Annotation component (matches compiled output)
const AnnotationCreate: React.FC<{ url: string; userId: string }> = ({ url, userId }) => {
    const [text, setText] = useState('');

    const addAnnotation = async () => {
        try {
            await annotationService.addAnnotation({
                id: `test-${Date.now()}`,
                url,
                text,
                userId,
                timestamp: Date.now(),
            });
            setText('');
        } catch (error) {
            console.error('Failed to add annotation:', error);
        }
    };

    return (
        <div className="annotation-create">
      <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your annotation"
      />
            <button onClick={addAnnotation}>Add Annotation</button>
        </div>
    );
};

// Annotation service (integrated to match compiled output)
const annotationCache: { [url: string]: Annotation[] } = {};

const annotationService = {
    async getAnnotations(url: string): Promise<Annotation[]> {
        return new Promise((resolve) => {
            const normalizedUrl = normalizeUrl(url);
            chrome.runtime.sendMessage({ action: 'getAnnotations', url: normalizedUrl }, (response) => {
                resolve(response.annotations || []);
            });
            chrome.runtime.sendMessage({ action: 'requestAnnotations', url: normalizedUrl });
        });
    },

    async addAnnotation(annotation: Annotation): Promise<void> {
        return new Promise((resolve, reject) => {
            const normalizedUrl = normalizeUrl(annotation.url);
            if (!annotationCache[normalizedUrl]) {
                annotationCache[normalizedUrl] = [];
            }
            annotationCache[normalizedUrl].push(annotation);
            chrome.runtime.sendMessage(
                { action: 'addAnnotation', annotation },
                (response) => {
                    if (response.success) {
                        resolve();
                    } else {
                        reject(new Error('Failed to add annotation'));
                    }
                }
            );
        });
    },
};

// Message listeners (integrated to match compiled output)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getAnnotations') {
        const normalizedUrl = normalizeUrl(msg.url);
        sendResponse({ annotations: annotationCache[normalizedUrl] || [] });
        return true;
    } else if (msg.action === 'addAnnotation') {
        sendResponse({ success: true });
        return true;
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'receiveAnnotations') {
        const normalizedUrl = normalizeUrl(msg.url);
        annotationCache[normalizedUrl] = msg.annotations;
        chrome.runtime.sendMessage({ action: 'updateAnnotations', url: normalizedUrl, annotations: msg.annotations });
    }
});

// Initialize content script
function initializeContentScript() {
    try {
        const container = document.createElement('div');
        container.id = 'citizenx-content-root';
        document.body.appendChild(container);

        const userId = localStorage.getItem('userAddress') || 'anonymous';

        chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to get current URL:', chrome.runtime.lastError.message);
                return;
            }
            if (response && response.url) {
                const root = createRoot(container);
                root.render(<AnnotationCreate url={response.url} userId={userId} />);
            } else {
                console.error('No URL received from background script');
            }
        });

        // Listen for URL changes
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.action === 'urlChanged' && msg.url) {
                const root = createRoot(container);
                root.render(<AnnotationCreate url={msg.url} userId={userId} />);
            }
        });
    } catch (error) {
        console.error('Content script initialization failed:', error);
    }
}

initializeContentScript();