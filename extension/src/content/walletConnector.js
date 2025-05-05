// src/content/walletConnector.js
console.log('CitizenX wallet connector content script loaded');

const getEthereumProvider = (maxAttempts = 10, interval = 500) => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkEthereum = () => {
            if (window.ethereum) {
                console.log('window.ethereum found:', window.ethereum);
                resolve(window.ethereum);
            } else if (attempts >= maxAttempts) {
                console.log('window.ethereum not found after max attempts');
                reject(new Error('Ethereum provider not found'));
            } else {
                attempts++;
                setTimeout(checkEthereum, interval);
            }
        };
        checkEthereum();
    });
};

console.log('Sending CONTENT_SCRIPT_READY message');
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Failed to send CONTENT_SCRIPT_READY message:', chrome.runtime.lastError.message);
    } else {
        console.log('CONTENT_SCRIPT_READY message sent successfully');
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    if (message.type === 'CHECK_ETHEREUM_PROVIDER') {
        getEthereumProvider()
            .then(() => {
                const hasEthereum = !!window.ethereum;
                console.log('CHECK_ETHEREUM_PROVIDER response:', { hasEthereum });
                sendResponse({ hasEthereum });
            })
            .catch(() => {
                console.log('CHECK_ETHEREUM_PROVIDER failed: Ethereum provider not found');
                sendResponse({ hasEthereum: false });
            });
        return true;
    } else if (message.type === 'CONNECT_WALLET') {
        getEthereumProvider()
            .then(() => {
                console.log('Attempting to connect wallet...');
                window.ethereum
                    .request({ method: 'eth_requestAccounts' })
                    .then(accounts => {
                        if (accounts.length > 0) {
                            console.log('Wallet connected, address:', accounts[0]);
                            sendResponse({ walletAddress: accounts[0] });
                        } else {
                            console.log('No accounts found');
                            sendResponse({ error: 'No accounts found.' });
                        }
                    })
                    .catch(err => {
                        console.log('Wallet connection error:', err);
                        sendResponse({ error: err.message });
                    });
            })
            .catch(() => {
                console.log('No Ethereum provider found');
                sendResponse({ error: 'Please install MetaMask or another Ethereum wallet provider.' });
            });
        return true;
    } else if (message.type === 'SUBSCRIBE_ACCOUNTS_CHANGED') {
        getEthereumProvider()
            .then(() => {
                console.log('Subscribing to accountsChanged');
                window.ethereum.on('accountsChanged', (accounts) => {
                    console.log('Accounts changed:', accounts);
                    chrome.runtime.sendMessage({
                        type: 'ACCOUNTS_CHANGED',
                        accounts,
                    });
                });
                sendResponse({ subscribed: true });
            })
            .catch(() => {
                console.log('No Ethereum provider for accountsChanged subscription');
                sendResponse({ error: 'Ethereum provider not found.' });
            });
        return true;
    }
});