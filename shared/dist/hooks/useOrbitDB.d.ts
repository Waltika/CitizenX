interface UseOrbitDBResult {
    db: any;
    error: string | null;
    isReady: boolean;
}
export declare const useOrbitDB: (url: string) => UseOrbitDBResult;
export {};
