// src/background.ts
console.log('background.ts: Service worker started');

const HEARTBEAT_INTERVAL = 1000;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('background.ts: Received message:', message);
    if (message.action === 'getCurrentTabUrl') {
        console.log('background.ts: Fetching current tab URL');
        getCurrentTabUrl()
            .then((url) => sendResponse({ url }))
            .catch((err) => sendResponse({ error: err.message }));
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['citizenx_redirect'], (result) => {
        const redirect = result.citizenx_redirect;
        if (redirect) {
            const { annotationId, targetUrl } = JSON.parse(redirect);
            chrome.tabs.create({ url: `${targetUrl}?annotationId=${annotationId}` });
            chrome.storage.local.remove(['citizenx_redirect']);
        }
    });
});

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

setInterval(() => {
    console.log('background.ts: Sending heartbeat');
    chrome.runtime.sendMessage({ action: 'heartbeat' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('background.ts: Heartbeat failed, side panel not active:', chrome.runtime.lastError);
        }
    });
}, HEARTBEAT_INTERVAL);