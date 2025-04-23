// src/background.js
console.log('CitizenX background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_POPUP') {
        chrome.windows.create({
            url: 'https://www.google.com',
            type: 'popup',
            width: 400,
            height: 600
        }, (window) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to open popup:', chrome.runtime.lastError.message);
                // Fallback to opening a tab
                chrome.tabs.create({
                    url: 'https://www.google.com',
                    active: true
                }, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to open tab:', chrome.runtime.lastError.message);
                    } else {
                        console.log('Tab opened successfully, tab ID:', tab.id);
                    }
                });
            } else {
                console.log('Popup opened successfully');
            }
        });
    } else if (message.type === 'WALLET_CONNECTED' || message.type === 'WALLET_CONNECTION_FAILED' || message.type === 'ACCOUNTS_CHANGED') {
        console.log('Background script forwarding message to side panel:', message);
        // Send message to the side panel specifically
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to forward message to side panel:', chrome.runtime.lastError.message);
            } else {
                console.log('Message forwarded to side panel successfully');
            }
        });
        // Close the popup or tab after wallet connection
        if (message.type !== 'ACCOUNTS_CHANGED' && sender.tab?.id) {
            setTimeout(() => {
                chrome.tabs.remove(sender.tab.id, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to close tab:', chrome.runtime.lastError.message);
                    } else {
                        console.log('Tab closed successfully');
                    }
                });
            }, 2000);
        }
    }
});