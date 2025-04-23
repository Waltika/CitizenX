// src/background.js
console.log('CitizenX background script loaded');

// Store tab IDs where the content script is ready
const readyTabs = new Set();

// Inject the content script into the active tab
const injectContentScript = (tabId) => {
    console.log('Attempting to inject content script into tab ID:', tabId);
    return new Promise((resolve, reject) => {
        if (!chrome.scripting) {
            console.error('chrome.scripting API is not available');
            reject(new Error('chrome.scripting API is not available'));
            return;
        }
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/walletConnector.js'],
            world: 'MAIN' // Explicitly inject into the MAIN world
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to inject content script:', chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                console.log('Content script injected into tab ID:', tabId);
                resolve(results);
            }
        });
    });
};

// Wait for the content script to signal it's ready
const waitForContentScriptReady = (tabId, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        if (readyTabs.has(tabId)) {
            resolve();
            return;
        }

        const timeoutId = setTimeout(() => {
            reject(new Error('Content script not ready within timeout period'));
        }, timeout);

        const handler = (message, sender, sendResponse) => {
            if (message.type === 'CONTENT_SCRIPT_READY' && sender.tab?.id === tabId) {
                clearTimeout(timeoutId);
                readyTabs.add(tabId);
                chrome.runtime.onMessage.removeListener(handler);
                resolve();
            }
        };

        chrome.runtime.onMessage.addListener(handler);
    });
};

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

            injectContentScript(tabId)
                .then(() => waitForContentScriptReady(tabId))
                .then(() => {
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
                })
                .catch(err => {
                    console.error('Injection or readiness check failed:', err);
                    sendResponse({ error: err.message });
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