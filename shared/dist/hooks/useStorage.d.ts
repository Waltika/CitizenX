import { StorageRepository } from '../storage/StorageRepository.js';
interface UseStorageReturn {
    storage: StorageRepository | null;
    error: string | null;
    isLoading: boolean;
}
export declare function useStorage(): UseStorageReturn;
export {};
