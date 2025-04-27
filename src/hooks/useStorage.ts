// src/hooks/useStorage.ts
import { useState, useEffect } from 'react';
import { StorageRepository } from '../storage/StorageRepository';
import { OrbitDBRepository } from '../storage/OrbitDBRepository';

export function useStorage(): StorageRepository {
    const [repository, setRepository] = useState<StorageRepository>(new OrbitDBRepository());

    useEffect(() => {
        const initRepository = async () => {
            const repo = new OrbitDBRepository();
            await repo.initialize();
            setRepository(repo);
        };
        initRepository();
    }, []);

    return repository;
}