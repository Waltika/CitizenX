import { useState, useEffect } from 'react';
import { StorageRepository } from '../storage/StorageRepository';

interface UseStorageReturn {
    storage: StorageRepository | null;
    error: string | null;
    isLoading: boolean;
}

export function useStorage(): UseStorageReturn {
    const [storage, setStorage] = useState<StorageRepository | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initRepository = async () => {
            try {
                console.log('useStorage: Starting storage initialization');
                const repo = new StorageRepository(); // Use StorageRepository instead of GunRepository
                await repo.initialize();
                console.log('useStorage: Storage initialized successfully');
                setStorage(repo);
                setError(null);
            } catch (err: any) {
                console.error('useStorage: Failed to initialize storage:', err.message || err);
                setError('Failed to initialize storage: ' + (err.message || 'Unknown error'));
                setStorage(null);
            } finally {
                setIsLoading(false);
            }
        };
        initRepository();
    }, []);

    return { storage, error, isLoading };
}