import { useState, useEffect } from 'react';
import { storage, StorageRepository } from '../storage/StorageRepository'; // Import the singleton instance

interface UseStorageReturn {
    storage: StorageRepository | null;
    error: string | null;
    isLoading: boolean;
}

export function useStorage(): UseStorageReturn {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initRepository = async () => {
            try {
                console.log('useStorage: Starting storage initialization');
                await storage.initialize(); // Initialize the singleton instance
                console.log('useStorage: Storage initialized successfully');
                setError(null);
            } catch (err: any) {
                console.error('useStorage: Failed to initialize storage:', err.message || err);
                setError('Failed to initialize storage: ' + (err.message || 'Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };
        initRepository();
    }, []);

    return { storage, error, isLoading };
}