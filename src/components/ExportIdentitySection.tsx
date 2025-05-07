import React, { useState } from 'react';
import { PassphraseModal } from './PassphraseModal';

interface ExportIdentitySectionProps {
    exportIdentity: (passphrase: string) => Promise<string>;
    onCloseSettings: () => void;
    onShowToast?: (message: string) => void; // New prop for toast
}

export const ExportIdentitySection: React.FC<ExportIdentitySectionProps> = ({
                                                                                exportIdentity,
                                                                                onCloseSettings,
                                                                                onShowToast,
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
        } catch (err: any) {
            console.error('Failed to export identity:', err);
            alert(err.message || 'Failed to export identity');
        }
    };

    const handleCloseExportModal = () => {
        setIsExportModalOpen(false);
        onCloseSettings();
    };

    const handleDownloadIdentity = () => {
        // Create a Blob with the exported identity string
        const blob = new Blob([exportedIdentity], { type: 'text/plain' });
        // Create a temporary URL for the Blob
        const url = URL.createObjectURL(blob);
        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'identity-export.txt';
        document.body.appendChild(link);
        link.click();
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        // Show toast confirmation
        onShowToast?.('Identity downloaded successfully');
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
                        className="export-modal-button"
                        onClick={handleDownloadIdentity}
                    >
                        Download
                    </button>
                    <button
                        className="export-modal-close-button"
                        onClick={handleCloseExportModal}
                    >
                        Close
                    </button>
                </div>
            )}
        </>
    );
};