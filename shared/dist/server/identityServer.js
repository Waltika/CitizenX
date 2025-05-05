import { exportKeyPair, importKeyPair } from '../utils/crypto.js';
export async function exportIdentityServer({ did, privateKey, profile, passphrase }) {
    const exportData = { did, privateKey, profile };
    const dataString = JSON.stringify(exportData);
    return exportKeyPair(dataString, passphrase);
}
export async function importIdentityServer({ data, passphrase }) {
    const decryptedData = await importKeyPair(data, passphrase);
    return JSON.parse(decryptedData);
}
