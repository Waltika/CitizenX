import { exportKeyPair, importKeyPair } from '../utils/crypto.js';
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

export async function exportIdentityServer({ did, privateKey, profile, passphrase }: ExportIdentityServerProps): Promise<string> {
    const exportData = { did, privateKey, profile };
    const dataString = JSON.stringify(exportData);
    return exportKeyPair(dataString, passphrase);
}

export async function importIdentityServer({ data, passphrase }: ImportIdentityServerProps): Promise<{ did: string, privateKey: string, profile: ProfileType | null }> {
    const decryptedData = await importKeyPair(data, passphrase);
    return JSON.parse(decryptedData);
}