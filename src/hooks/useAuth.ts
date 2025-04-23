// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';

interface UseAuthResult {
    walletAddress: string | null;
    connectWallet: () => Promise<void>;
    signOut: () => void;
    error: string | null;
}

const useAuth = (): UseAuthResult => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = (message: any): Promise<any> => {
        console.log('Side panel sending message:', message);
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Message sending error:', chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response.error) {
                    console.error('Content script response error:', response.error);
                    reject(new Error(response.error));
                } else {
                    console.log('Content script response:', response);
                    resolve(response);
                }
            });
        });
    };

    const connectWallet = async () => {
        try {
            const { hasEthereum } = await sendMessage({ type: 'CHECK_ETHEREUM_PROVIDER' });
            if (!hasEthereum) {
                throw new Error('Please install MetaMask or another Ethereum wallet provider.');
            }

            const { walletAddress: address } = await sendMessage({ type: 'CONNECT_WALLET' });
            setWalletAddress(address);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            setWalletAddress(null);
        }
    };

    const signOut = () => {
        setWalletAddress(null);
        setError(null);
    };

    useEffect(() => {
        const checkWalletConnection = async () => {
            try {
                const { hasEthereum } = await sendMessage({ type: 'CHECK_ETHEREUM_PROVIDER' });
                if (hasEthereum) {
                    const { walletAddress: address } = await sendMessage({ type: 'CONNECT_WALLET' });
                    if (address) {
                        setWalletAddress(address);
                    }
                }
            } catch (err) {
                console.error('Failed to check wallet connection:', err);
            }
        };

        checkWalletConnection();

        sendMessage({ type: 'SUBSCRIBE_ACCOUNTS_CHANGED' }).catch(err => {
            console.error('Failed to subscribe to accounts changed:', err);
        });

        const handleAccountsChanged = (message: any) => {
            if (message.type === 'ACCOUNTS_CHANGED') {
                const accounts = message.accounts;
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                } else {
                    setWalletAddress(null);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handleAccountsChanged);

        return () => {
            chrome.runtime.onMessage.removeListener(handleAccountsChanged);
        };
    }, []);

    return { walletAddress, connectWallet, signOut, error };
};

export default useAuth;