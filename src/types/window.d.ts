// src/types/window.d.ts
interface Window {
    ethereum?: {
        // General method to send requests (e.g., eth_requestAccounts)
        request: (args: { method: string; params?: any[] }) => Promise<any>;
        // Event listener for account changes
        on: (event: string, callback: (...args: any[]) => void) => void;
        // Remove event listener
        removeListener: (event: string, callback: (...args: any[]) => void) => void;
        // Legacy send method (used by some providers)
        send: (method: string, params?: any[]) => Promise<any>;
        // Check if the provider is MetaMask (optional)
        isMetaMask?: boolean;
    };
}