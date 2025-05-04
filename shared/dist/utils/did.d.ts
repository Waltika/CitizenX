export declare function generateDID(): Promise<{
    did: string;
    privateKey: string;
}>;
export declare function validateDID(did: string): boolean;
