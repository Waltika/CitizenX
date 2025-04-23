// src/background.js
console.log('CitizenX background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_POPUP') {
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 400,
            height: 600
        }, (window) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to open popup:', chrome.runtime.lastError.message);
            } else {
                console.log('Popup opened successfully');
            }
        });
    } else if (message.type === 'WALLET_CONNECTED' || message.type === 'WALLET_CONNECTION_FAILED' || message.type === 'ACCOUNTS_CHANGED') {
        console.log('Background script forwarding message to side panel:', message);
        chrome.runtime.sendMessage(message);
    }
});