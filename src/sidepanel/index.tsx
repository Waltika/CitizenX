import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const SidePanel: React.FC = () => {
    useEffect(() => {
        window.addEventListener('message', (event) => {
            if (event.origin !== 'https://waltika.github.io') return;
            if (event.data.action === 'requestUrl') {
                chrome.runtime.sendMessage({ action: 'getCurrentUrl' }, (response) => {
                    event.source?.postMessage({ action: 'receiveUrl', url: response.url }, event.origin);
                });
            } else if (event.data.action === 'receiveAnnotations') {
                chrome.runtime.sendMessage(event.data);
            }
        });
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