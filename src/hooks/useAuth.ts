// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers'; // Use BrowserProvider for ethers v6

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
            if (!window.ethereum) {
                throw new Error('Please install MetaMask or another Ethereum wallet provider.');
            }

            const provider = new BrowserProvider(window.ethereum);
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
            if (window.ethereum) {
                const provider = new BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0].address);
                }
            }
        };

        checkWalletConnection();

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                } else {
                    setWalletAddress(null);
                }
            });
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
        };
    }, []);

    return { walletAddress, connectWallet, signOut, error };
};

export default useAuth;