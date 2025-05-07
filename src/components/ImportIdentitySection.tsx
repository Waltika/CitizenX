import React, { useState } from 'react';
import './styles/common.css';
import './ImportIdentitySection.css';

interface ImportIdentitySectionProps {
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    onCloseSettings: (justImported?: boolean) => void;
    onBeforeImport?: () => void;
}

export const ImportIdentitySection: React.FC<ImportIdentitySectionProps> = ({
                                                                                importIdentity,
                                                                                onCloseSettings,
                                                                                onBeforeImport,
                                                                            }) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState('');
    const [importPassphrase, setImportPassphrase] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');

    const handleImport = async () => {
        if (!importData || !importPassphrase) {
            setImportError('Both encrypted data and passphrase are required');
            return;
        }

        setIsImporting(true);
        setImportError('');

        try {
            onBeforeImport?.();
            await importIdentity(importData, importPassphrase);
            setIsImportModalOpen(false);
            onCloseSettings(true);
        } catch (error) {
            console.error('Error importing identity:', error);
            setImportError('Invalid data or passphrase. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <button
                className="button-primary button-full-width"
                onClick={() => setIsImportModalOpen(true)}
            >
                Import Identity
            </button>

            {isImportModalOpen && (
                <div className="modal">
                    <h3 className="modal-title">Import Identity</h3>
                    <p>Paste your encrypted identity data:</p>
                    <textarea
                        className="modal-textarea"
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Paste encrypted identity data here"
                    />
                    <p>Enter your passphrase:</p>
                    <input
                        type="password"
                        placeholder="Enter your passphrase"
                        value={importPassphrase}
                        onChange={(e) => setImportPassphrase(e.target.value)}
                        className="modal-input"
                    />
                    {importError && <p className="error-text">{importError}</p>}
                    <button
                        className="modal-save-button"
                        onClick={handleImport}
                        disabled={isImporting || !importData || !importPassphrase}
                    >
                        {isImporting ? 'Importing...' : 'Import'}
                    </button>
                    <button
                        className="modal-cancel-button"
                        onClick={() => {
                            setIsImportModalOpen(false);
                            setImportData('');
                            setImportPassphrase('');
                            setImportError('');
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </>
    );
};