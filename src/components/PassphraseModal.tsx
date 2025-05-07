// src/components/PassphraseModal.tsx
import React from 'react';
import './PassphraseModal.css';
import './PassphraseModal.css';

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
        <div className="profile-modal">
            <h2 className="profile-modal-title">
                {action === 'export' ? 'Export Identity' : 'Import Identity'}
            </h2>
            <input
                type="password"
                value={passphrase}
                onChange={(e) => onPassphraseChange(e.target.value)}
                placeholder="Enter passphrase"
                className="profile-modal-input"
            />
            <div className="profile-modal-buttons">
                <button
                    onClick={onConfirm}
                    className="profile-modal-save-button"
                >
                    {action === 'export' ? 'Export' : 'Import'}
                </button>
                <button
                    onClick={onCancel}
                    className="profile-modal-cancel-button"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};