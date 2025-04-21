chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) {
        chrome.tabs.sendMessage(tabId, { action: 'urlChanged', url: changeInfo.url }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to send urlChanged message:', chrome.runtime.lastError.message);
            }
        });
        chrome.sidePanel.open({ tabId }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to open side panel:', chrome.runtime.lastError.message);
            }
        });
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getCurrentUrl') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                sendResponse({ url: tabs[0].url });
            } else {
                console.warn('No active tab found for getCurrentUrl');
                sendResponse({ url: null });
            }
        });
        return true;
    } else if (msg.action === 'requestAnnotations' || msg.action === 'addAnnotation') {
        chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to forward message:', chrome.runtime.lastError.message);
            }
        });
    }
});