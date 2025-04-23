// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';

interface UseAuthResult {
    walletAddress: string | null;
    connectWallet: () => Promise<void>;
    signOut: () => void;
    error: string | null;
}

const useAuth = (): UseAuthResult => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const connectWallet = async () => {
        try {
            // Open the popup to connect to MetaMask
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
            // The popup will send a message back with the wallet address or error
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
        const handleWalletMessages = (message: any) => {
            if (message.type === 'WALLET_CONNECTED') {
                setWalletAddress(message.walletAddress);
                setError(null);
            } else if (message.type === 'WALLET_CONNECTION_FAILED') {
                setError(message.error);
                setWalletAddress(null);
            } else if (message.type === 'ACCOUNTS_CHANGED') {
                const accounts = message.accounts;
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                } else {
                    setWalletAddress(null);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handleWalletMessages);

        return () => {
            chrome.runtime.onMessage.removeListener(handleWalletMessages);
        };
    }, []);

    return { walletAddress, connectWallet, signOut, error };
};

export default useAuth;