// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface UseAuthResult {
    walletAddress: string | null;
    connectWallet: () => Promise<void>;
    signOut: () => void;
    error: string | null;
}

export const useAuth = (): UseAuthResult => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if MetaMask is installed and if the user is already connected
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await provider.listAccounts();
                    if (accounts.length > 0) {
                        setWalletAddress(accounts[0].address);
                    }
                } catch (err) {
                    console.error('Failed to check wallet connection:', err);
                }
            }
        };

        checkConnection();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                } else {
                    setWalletAddress(null);
                }
            });
        }

        // Cleanup listener on unmount
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
        };
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('MetaMask is not installed. Please install it to continue.');
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []);
            setWalletAddress(accounts[0]);
            setError(null);
        } catch (err) {
            setError('Failed to connect wallet. Please try again.');
            console.error('Wallet connection