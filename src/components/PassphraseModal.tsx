// src/components/PassphraseModal.tsx
import React from 'react';
import './styles/common.css';

interface PassphraseModalProps {
    action: 'export' | 'import';
    passphrase: string;
    onPassphraseChange: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({
                                                                    action,
                                                                    passphrase,
                                                                    onPassphraseChange,
                                                                    onConfirm,
                                                                    onCancel,
                                                                }) => {
    return (
        <div className="modal">
            <h2 className="modal-title">
                {action === 'export' ? 'Export Identity' : 'Import Identity'}
            </h2>
            <input
                type="password"
                value={passphrase}
                onChange={(e) => onPassphraseChange(e.target.value)}
                placeholder="Enter passphrase"
                className="modal-input"
            />
            <div className="modal-buttons">
                <button
                    onClick={onConfirm}
                    className="modal-save-button"
                >
                    {action === 'export' ? 'Export' : 'Import'}
                </button>
                <button
                    onClick={onCancel}
                    className="modal-cancel-button"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};