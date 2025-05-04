import { ProfileType } from '../types/index.js';
interface ExportIdentityServerProps {
    did: string;
    privateKey: string;
    profile: ProfileType | null;
    passphrase: string;
}
interface ImportIdentityServerProps {
    data: string;
    passphrase: string;
}
export declare function exportIdentityServer({ did, privateKey, profile, passphrase }: ExportIdentityServerProps): Promise<string>;
export declare function importIdentityServer({ data, passphrase }: ImportIdentityServerProps): Promise<{
    did: string;
    privateKey: string;
    profile: ProfileType | null;
}>;
export {};
