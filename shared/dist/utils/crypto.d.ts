export declare function generateKeyPair(): Promise<{
    did: string;
    privateKey: string;
}>;
export declare function exportKeyPair(data: string, passphrase: string): Promise<string>;
export declare function importKeyPair(encryptedData: string, passphrase: string): Promise<string>;
export declare function signMessage(privateKeyHex: string, message: string): Promise<string>;
export declare function verifySignature(did: string, message: string, signatureHex: string): Promise<boolean>;
