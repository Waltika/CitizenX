import { useState, useEffect } from 'react';
import { StorageRepository } from '../storage/StorageRepository.js';
export function useStorage() {
    const [storage, setStorage] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const initRepository = async () => {
            try {
                console.log('useStorage: Starting storage initialization');
                const repo = new StorageRepository(); // Use StorageRepository instead of GunRepository
                await repo.initialize();
                console.log('useStorage: Storage initialized successfully');
                setStorage(repo);
                setError(null);
            }
            catch (err) {
                console.error('useStorage: Failed to initialize storage:', err.message || err);
                setError('Failed to initialize storage: ' + (err.message || 'Unknown error'));
                setStorage(null);
            }
            finally {
                setIsLoading(false);
            }
        };
        initRepository();
    }, []);
    return { storage, error, isLoading };
}
