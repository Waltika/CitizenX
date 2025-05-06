// src/background.ts
console.log('background.ts: Service worker started');

const HEARTBEAT_INTERVAL = 1000;

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

setInterval(() => {
    console.log('background.ts: Sending heartbeat');
    chrome.runtime.sendMessage({ action: 'heartbeat' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('background.ts: Heartbeat failed, side panel not active:', chrome.runtime.lastError);
        }
    });
}, HEARTBEAT_INTERVAL);