// src/content/popupWalletConnector.js
console.log('CitizenX popup wallet connector loaded');

const getEthereumProvider = (maxAttempts = 10, interval = 500) => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkEthereum = () => {
            console.log('Checking for window.ethereum, attempt:', attempts + 1);
            if (window.ethereum) {
                console.log('window.ethereum found:', window.ethereum);
                resolve(window.ethereum);
            } else if (attempts >= maxAttempts) {
                console.log('window.ethereum not found after max attempts');
                reject(new Error('Please install MetaMask or another Ethereum wallet provider'));
            } else {
                attempts++;
                setTimeout(checkEthereum, interval);
            }
        };
        checkEthereum();
    });
};

getEthereumProvider()
    .then(ethereum => {
        console.log('Connecting to MetaMask...');
        ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    console.log('Wallet connected, address:', accounts[0]);
                    chrome.runtime.sendMessage({
                        type: 'WALLET_CONNECTED',
                        walletAddress: accounts[0]
                    });
                } else {
                    console.log('No accounts found');
                    chrome.runtime.sendMessage({
                        type: 'WALLET_CONNECTION_FAILED',
                        error: 'No accounts found'
                    });
                }
            })
            .catch(err => {
                console.error('Wallet connection error:', err);
                chrome.runtime.sendMessage({
                    type: 'WALLET_CONNECTION_FAILED',
                    error: err.message
                });
            });

        ethereum.on('accountsChanged', (accounts) => {
            console.log('Accounts changed:', accounts);
            chrome.runtime.sendMessage({
                type: 'ACCOUNTS_CHANGED',
                accounts
            });
        });
    })
    .catch(err => {
        console.error('Ethereum provider error:', err);
        chrome.runtime.sendMessage({
            type: 'WALLET_CONNECTION_FAILED',
            error: err.message
        });
    });