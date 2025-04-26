// src/background.ts

// Cache operations in chrome.storage.local
async function cacheOperation(action: string, data: any) {
    const cacheKey = action === 'putProfile' ? 'pendingProfiles' : 'pendingAnnotations';
    const result = await chrome.storage.local.get([cacheKey]);
    const pending = result[cacheKey] || [];
    pending.push({ action, data });
    await chrome.storage.local.set({ [cacheKey]: pending });
    console.log(`background.ts: Cached operation - ${cacheKey}:`, pending);
}

// Keep track of side panel activity
let isSidePanelActive = false;

// Log service worker startup
console.log('background.ts: Service worker started');

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    console.log('background.ts: Received message:', message);

    if (message.action === 'heartbeat') {
        console.log('background.ts: Heartbeat received');
        isSidePanelActive = true;
        sendResponse({ success: true });
        return true;
    }

    if (message.action === 'putProfile' || message.action === 'putAnnotation') {
        if (!isSidePanelActive) {
            // Side panel is closed; cache the operation
            console.log('background.ts: Caching operation:', message.action, message.action === 'putProfile' ? message.profile : message.annotation);
            cacheOperation(message.action, message.action === 'putProfile' ? message.profile : message.annotation)
                .then(() => sendResponse({ success: true, cached: true }))
                .catch((error: Error) => sendResponse({ error: error.message }));
        } else {
            // Side panel is open; let it handle the operation
            console.log('background.ts: Side panel active, proceeding with operation:', message.action);
            sendResponse({ success: true, proceed: true });
        }
        return true;
    }

    if (message.action === 'syncPending') {
        console.log('background.ts: Sync pending operations request received');
        (async () => {
            const cacheKeys = ['pendingProfiles', 'pendingAnnotations'];
            const result = await chrome.storage.local.get(cacheKeys);
            const pending = {
                profiles: result.pendingProfiles || [],
                annotations: result.pendingAnnotations || [],
            };
            console.log('background.ts: Sending pending operations:', pending);
            sendResponse({ pending });

            // Clear the cache after sending to the side panel
            await chrome.storage.local.remove(cacheKeys);
            console.log('background.ts: Cleared pending operations cache');
        })();
        return true;
    }

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
        return true;
    }

    console.warn('background.ts: Unhandled message action:', message.action);
    sendResponse({ error: 'Unhandled message action' });
    return true; // Keep the message channel open for async responses
});

// Heartbeat to detect if the side panel is still active
setInterval(() => {
    isSidePanelActive = false;
    console.log('background.ts: Sending heartbeat');
    chrome.runtime.sendMessage({ action: 'heartbeat' }, (response: any) => {
        if (chrome.runtime.lastError || !response?.success) {
            console.log('background.ts: Heartbeat failed, side panel not active:', chrome.runtime.lastError || 'No response');
            isSidePanelActive = false;
        } else {
            console.log('background.ts: Heartbeat succeeded, side panel active');
        }
    });
}, 5000);