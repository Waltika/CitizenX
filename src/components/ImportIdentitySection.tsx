import React, { useState } from 'react';
import './ImportIdentitySection.css';

interface ImportIdentitySectionProps {
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    onCloseSettings: (justImported?: boolean) => void;
    onBeforeImport?: () => void; // Add the missing prop to the interface
}

export const ImportIdentitySection: React.FC<ImportIdentitySectionProps> = ({
                                                                                importIdentity,
                                                                                onCloseSettings,
                                                                                onBeforeImport,
                                                                            }) => {
    const [importIdentityData, setImportIdentityData] = useState('');
    const [importPassphrase, setImportPassphrase] = useState('');

    const handleImportIdentity = async () => {
        if (!importIdentityData.trim()) {
            alert('Please paste the identity data');
            return;
        }
        if (!importPassphrase) {
            alert('Please enter the passphrase');
            return;
        }

        try {
            onBeforeImport?.(); // Signal that an import is about to happen
            await importIdentity(importIdentityData, importPassphrase);
            setImportIdentityData('');
            setImportPassphrase('');
            onCloseSettings(true);
        } catch (err: any) {
            console.error('Failed to import identity:', err);
            alert(err.message || 'Failed to import identity');
        }
    };

    return (
        <div className="import-section">
            <textarea
                className="import-textarea"
                value={importIdentityData}
                onChange={(e) => setImportIdentityData(e.target.value)}
                placeholder="Paste identity to import..."
            />
            <input
                type="password"
                className="passphrase-input"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                placeholder="Enter passphrase..."
            />
            <button
                className="import-button"
                onClick={handleImportIdentity}
                disabled={!importIdentityData.trim() || !importPassphrase.trim()}
            >
                Import Identity
            </button>
        </div>
    );
};