console.log('background.ts: Service worker started');

const HEARTBEAT_INTERVAL = 1000; // Heartbeat interval in milliseconds

// Fetch the current tab's URL
const getCurrentTabUrl = async (): Promise<string | undefined> => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('background.ts: Fetched tab URL:', tab?.url);
        return tab?.url;
    } catch (err) {
        console.error('background.ts: Failed to fetch tab URL:', err);
        return undefined;
    }
};

// Send the URL to the side panel
const sendUrlToSidePanel = async () => {
    const url = await getCurrentTabUrl();
    if (url) {
        try {
            await chrome.runtime.sendMessage({ action: 'urlChanged', url });
            console.log('background.ts: Sent URL to side panel:', url);
        } catch (err) {
            console.log('background.ts: Side panel not active:', err);
        }
    }
};

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('background.ts: Received message:', message);
    if (message.action === 'getCurrentTabUrl') {
        console.log('background.ts: Fetching current tab URL');
        getCurrentTabUrl()
            .then((url) => {
                sendResponse({ url });
            })
            .catch((err) => {
                console.error('background.ts: Failed to fetch tab URL:', err);
                sendResponse({ error: err.message });
            });
        return true; // Keep the message channel open for async response
    }
});

// Listen for tab and window changes
chrome.tabs.onActivated.addListener(() => {
    console.log('background.ts: Tab activated, sending URL update');
    sendUrlToSidePanel();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    console.log('background.ts: Window focus changed, sending URL update');
    sendUrlToSidePanel();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log('background.ts: Tab URL updated, sending URL update');
        sendUrlToSidePanel();
    }
});

// Periodically send heartbeat to check if side panel is active
setInterval(() => {
    console.log('background.ts: Sending heartbeat');
    chrome.runtime.sendMessage({ action: 'heartbeat' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('background.ts: Heartbeat failed, side panel not active:', chrome.runtime.lastError);
        }
    });
}, HEARTBEAT_INTERVAL);