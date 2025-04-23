// src/background.js
console.log('CitizenX background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TAB_URL') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error('No active tab found');
                sendResponse({ url: '' });
                return;
            }
            const tabUrl = tabs[0].url || '';
            sendResponse({ url: tabUrl });
        });
        return true; // Indicate that sendResponse will be called asynchronously
    }
});