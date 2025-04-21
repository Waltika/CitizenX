import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const SidePanel: React.FC = () => {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate event origin
            if (event.origin !== 'https://waltika.github.io') {
                return;
            }

            // Ensure event.source is a Window object
            if (!event.source || !(event.source instanceof Window)) {
                console.warn('Invalid event source:', event.source);
                return;
            }

            if (event.data.action === 'requestUrl') {
                chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Failed to get current URL:', chrome.runtime.lastError.message);
                        return;
                    }
                    if (response && response.url && event.source) {
                        event.source.postMessage(
                            { action: 'receiveUrl', url: response.url },
                            { targetOrigin: event.origin } // Use WindowPostMessageOptions
                        );
                    } else {
                        console.warn('No URL received from background script');
                    }
                });
            } else if (event.data.action === 'receiveAnnotations') {
                chrome.runtime.sendMessage(event.data, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Failed to forward annotations:', chrome.runtime.lastError.message);
                    }
                });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div className="w-full h-full">
            <iframe
                id="citizenx-iframe"
                src="https://waltika.github.io/CitizenX/"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />);