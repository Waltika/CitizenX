// src/components/ImportIdentitySection.tsx
import React, { useState } from 'react';
import { PassphraseModal } from './PassphraseModal';

interface ImportIdentitySectionProps {
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    onCloseSettings: () => void;
}

export const ImportIdentitySection: React.FC<ImportIdentitySectionProps> = ({
                                                                                importIdentity,
                                                                                onCloseSettings,
                                                                            }) => {
    const [importIdentityData, setImportIdentityData] = useState('');
    const [importPassphrase, setImportPassphrase] = useState('');
    const [passphraseModalOpen, setPassphraseModalOpen] = useState(false);

    const handleImportIdentity = async () => {
        if (!importIdentityData.trim()) {
            alert('Please paste the identity data');
            return;
        }
        setPassphraseModalOpen(true);
    };

    const handleImportWithPassphrase = async () => {
        if (!importPassphrase) {
            alert('Please enter the passphrase');
            return;
        }

        try {
            await importIdentity(importIdentityData, importPassphrase);
            setImportIdentityData('');
            setImportPassphrase('');
            setPassphraseModalOpen(false);
            onCloseSettings();
        } catch (err : any) {
            console.error('Failed to import identity:', err);
            alert(err.message || 'Failed to import identity');
        }
    };

    return (
        <>
            <div className="import-section">
                <textarea
                    className="import-textarea"
                    value={importIdentityData}
                    onChange={(e) => setImportIdentityData(e.target.value)}
                    placeholder="Paste identity to import..."
                />
                <button
                    className="import-button"
                    onClick={handleImportIdentity}
                    disabled={!importIdentityData.trim()}
                >
                    Import Identity
                </button>
            </div>
            {passphraseModalOpen && (
                <PassphraseModal
                    action="import"
                    passphrase={importPassphrase}
                    onPassphraseChange={setImportPassphrase}
                    onConfirm={handleImportWithPassphrase}
                    onCancel={() => {
                        setPassphraseModalOpen(false);
                        setImportPassphrase('');
                    }}
                />
            )}
        </>
    );
};