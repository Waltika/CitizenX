// src/popup.js
console.log('CitizenX popup loaded');

if (window.ethereum) {
    window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => {
            if (accounts.length > 0) {
                chrome.runtime.sendMessage({
                    type: 'WALLET_CONNECTED',
                    walletAddress: accounts[0]
                });
            } else {
                chrome.runtime.sendMessage({
                    type: 'WALLET_CONNECTION_FAILED',
                    error: 'No accounts found'
                });
            }
            window.close();
        })
        .catch(err => {
            chrome.runtime.sendMessage({
                type: 'WALLET_CONNECTION_FAILED',
                error: err.message
            });
            window.close();
        });

    window.ethereum.on('accountsChanged', (accounts) => {
        chrome.runtime.sendMessage({
            type: 'ACCOUNTS_CHANGED',
            accounts
        });
    });
} else {
    chrome.runtime.sendMessage({
        type: 'WALLET_CONNECTION_FAILED',
        error: 'Please install MetaMask or another Ethereum wallet provider'
    });
    window.close();
}