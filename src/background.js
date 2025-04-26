// src/background.js

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'test') {
        console.log('Background.js received test message');
        sendResponse({ success: true });
    }
    return true; // Keep the message channel open for async responses
});