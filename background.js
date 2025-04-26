// src/background.js

// Cache operations in chrome.storage.local
async function cacheOperation(action, data) {
    const cacheKey = action === 'putProfile' || action === 'getProfiles' ? 'pendingProfiles' : 'pendingAnnotations';
    const result = await chrome.storage.local.get([cacheKey]);
    const pending = result[cacheKey] || [];
    pending.push({ action, data });
    await chrome.storage.local.set({ [cacheKey]: pending });
}

// Keep track of side panel activity
let isSidePanelActive = false;

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'heartbeat') {
        isSidePanelActive = true;
        sendResponse({ success: true });
    } else if (message.action === 'putProfile' || message.action === 'putAnnotation') {
        if (!isSidePanelActive) {
            // Side panel is closed; cache the operation
            cacheOperation(message.action, message.action === 'putProfile' ? message.profile : message.annotation)
                .then(() => sendResponse({ success: true, cached: true }))
                .catch((error) => sendResponse({ error: error.message }));
        } else {
            // Side panel is open; let it handle the operation
            sendResponse({ success: true, proceed: true });
        }
    } else if (message.action === 'getProfiles' || message.action === 'getAnnotations') {
        // Return immediately, as the side panel will handle fetching from OrbitDB
        sendResponse({ success: true, proceed: true });
    } else if (message.action === 'syncPending') {
        // Return pending operations to the side panel for syncing
        (async () => {
            const cacheKeys = ['pendingProfiles', 'pendingAnnotations'];
            const result = await chrome.storage.local.get(cacheKeys);
            const pending = {
                profiles: result.pendingProfiles || [],
                annotations: result.pendingAnnotations || []
            };
            sendResponse({ pending });

            // Clear the cache after sending to the side panel
            await chrome.storage.local.remove(cacheKeys);
        })();
    }

    return true; // Keep the message channel open for async responses
});

// Heartbeat to detect if the side panel is still active
setInterval(() => {
    isSidePanelActive = false;
    chrome.runtime.sendMessage({ action: 'heartbeat' }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
            isSidePanelActive = false;
        }
    });
}, 5000);