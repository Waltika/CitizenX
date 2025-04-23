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

    // Function to check for window.ethereum with polling
    const getEthereumProvider = async (maxAttempts = 10, interval = 500): Promise<any> => {
        let attempts = 0;
        while (attempts < maxAttempts) {
            if (window.ethereum) {
                return window.ethereum;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        throw new Error('Please install MetaMask or another Ethereum wallet provider.');
    };

    const connectWallet = async () => {
        try {
            const ethereum = await getEthereumProvider();
            const provider = new BrowserProvider(ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
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
                const ethereum = await getEthereumProvider();
                const provider = new BrowserProvider(ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0].address);
                }
            } catch (err) {
                console.error('Failed to check wallet connection:', err);
            }
        };

        checkWalletConnection();

        // Listen for account changes
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
            } else {
                setWalletAddress(null);
            }
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        } else {
            // Poll for window.ethereum in case it appears later
            const interval = setInterval(() => {
                if (window.ethereum) {
                    window.ethereum.on('accountsChanged', handleAccountsChanged);
                    clearInterval(interval);
                }
            }, 500);

            return () => clearInterval(interval);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, []);

    return { walletAddress, connectWallet, signOut, error };
};

export default useAuth;