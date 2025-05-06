// src/components/ExportIdentitySection.tsx
import React, { useState } from 'react';
import { PassphraseModal } from './PassphraseModal';

interface ExportIdentitySectionProps {
    exportIdentity: (passphrase: string) => Promise<string>;
    onCloseSettings: () => void;
}

export const ExportIdentitySection: React.FC<ExportIdentitySectionProps> = ({
                                                                                exportIdentity,
                                                                                onCloseSettings,
                                                                            }) => {
    const [passphrase, setPassphrase] = useState('');
    const [passphraseModalOpen, setPassphraseModalOpen] = useState(false);
    const [exportedIdentity, setExportedIdentity] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const handleExportIdentity = async () => {
        setPassphraseModalOpen(true);
    };

    const handleExportWithPassphrase = async () => {
        if (!passphrase) {
            alert('Please enter a passphrase');
            return;
        }

        try {
            const identity = await exportIdentity(passphrase);
            setExportedIdentity(identity);
            setIsExportModalOpen(true);
            setPassphraseModalOpen(false);
            setPassphrase('');
            onCloseSettings();
        } catch (err : any) {
            console.error('Failed to export identity:', err);
            alert(err.message || 'Failed to export identity');
        }
    };

    return (
        <>
            <button
                className="settings-menu-button"
                onClick={handleExportIdentity}
            >
                Export Identity
            </button>
            {passphraseModalOpen && (
                <PassphraseModal
                    action="export"
                    passphrase={passphrase}
                    onPassphraseChange={setPassphrase}
                    onConfirm={handleExportWithPassphrase}
                    onCancel={() => {
                        setPassphraseModalOpen(false);
                        setPassphrase('');
                    }}
                />
            )}
            {isExportModalOpen && (
                <div className="export-modal">
                    <h2 className="export-modal-title">Export Identity</h2>
                    <textarea
                        className="export-modal-textarea"
                        value={exportedIdentity}
                        readOnly
                    />
                    <button
                        className="export-modal-button"
                        onClick={() => navigator.clipboard.writeText(exportedIdentity)}
                    >
                        Copy to Clipboard
                    </button>
                    <button
                        className="export-modal-close-button"
                        onClick={() => setIsExportModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
            )}
        </>
    );
};