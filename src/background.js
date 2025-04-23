// src/background.js
console.log('CitizenX background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);
    if (message.type === 'CHECK_ETHEREUM_PROVIDER' || message.type === 'CONNECT_WALLET' || message.type === 'SUBSCRIBE_ACCOUNTS_CHANGED') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error('No active tab found');
                sendResponse({ error: 'No active tab found' });
                return;
            }
            const tabId = tabs[0].id;
            if (!tabId) {
                console.error('Active tab has no ID');
                sendResponse({ error: 'Active tab has no ID' });
                return;
            }
            console.log('Background script forwarding message to tab ID:', tabId);
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Background script message sending error:', chrome.runtime.lastError.message);
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    console.log('Background script received response from content script:', response);
                    sendResponse(response);
                }
            });
        });
        return true;
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ACCOUNTS_CHANGED') {
        console.log('Background script forwarding ACCOUNTS_CHANGED to side panel:', message);
        chrome.runtime.sendMessage(message);
    }
});