// src/background.ts

// Log service worker startup
console.log('background.ts: Service worker started');

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    console.log('background.ts: Received message:', message);

    if (message.action === 'getCurrentTabUrl') {
        console.log('background.ts: Fetching current tab URL');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('background.ts: Failed to query tabs:', chrome.runtime.lastError);
                sendResponse({ error: 'Failed to query tabs' });
                return;
            }
            if (tabs[0] && tabs[0].url) {
                console.log('background.ts: Fetched tab URL:', tabs[0].url);
                sendResponse({ url: tabs[0].url });
            } else {
                console.error('background.ts: No active tab or URL found');
                sendResponse({ error: 'No active tab or URL found' });
            }
        });
        return true; // Keep the message channel open for async responses
    }

    console.warn('background.ts: Unhandled message action:', message.action);
    sendResponse({ error: 'Unhandled message action' });
    return true;
});