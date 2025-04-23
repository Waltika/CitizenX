// src/content/walletConnector.js
console.log('CitizenX wallet connector content script loaded');

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHECK_ETHEREUM_PROVIDER') {
        const hasEthereum = !!window.ethereum;
        sendResponse({ hasEthereum });
    } else if (message.type === 'CONNECT_WALLET') {
        if (!window.ethereum) {
            sendResponse({ error: 'Please install MetaMask or another Ethereum wallet provider.' });
            return;
        }

        window.ethereum
            .request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    sendResponse({ walletAddress: accounts[0] });
                } else {
                    sendResponse({ error: 'No accounts found.' });
                }
            })
            .catch(err => {
                sendResponse({ error: err.message });
            });

        // Keep the message channel open for async response
        return true;
    } else if (message.type === 'SUBSCRIBE_ACCOUNTS_CHANGED') {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                chrome.runtime.sendMessage({
                    type: 'ACCOUNTS_CHANGED',
                    accounts,
                });
            });
            sendResponse({ subscribed: true });
        } else {
            sendResponse({ error: 'Ethereum provider not found.' });
        }
    }
});