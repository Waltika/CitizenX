import React, { useState } from 'react';
import { ImportIdentitySection } from './ImportIdentitySection';
import { ExportIdentitySection } from './ExportIdentitySection';
import './SettingsPanel.css';

interface SettingsPanelProps {
    did: string | null;
    authenticate: () => Promise<void>;
    signOut: () => Promise<void>;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
    onCloseSettings: (justImported?: boolean) => void;
    onBeforeImport?: () => void;
    onResetJustImported?: () => void;
    onShowToast?: (message: string) => void; // New prop for toast
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
                                                                did,
                                                                authenticate,
                                                                signOut,
                                                                exportIdentity,
                                                                importIdentity,
                                                                onCloseSettings,
                                                                onBeforeImport,
                                                                onResetJustImported,
                                                                onShowToast,
                                                            }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleAuthenticate = async () => {
        onResetJustImported?.();
        await authenticate();
        setIsSettingsOpen(false);
    };

    const handleSignOut = async () => {
        onResetJustImported?.();
        await signOut();
        setIsSettingsOpen(false);
    };

    const handleCloseSettings = (justImported?: boolean) => {
        setIsSettingsOpen(false);
        onCloseSettings(justImported);
    };

    return (
        <div className="settings-menu-container">
            <button
                className="settings-button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            >
                ⚙️
            </button>
            {isSettingsOpen && (
                <div className="settings-menu">
                    {!did ? (
                        <div className="auth-section">
                            <button
                                className="authenticate-button"
                                onClick={handleAuthenticate}
                            >
                                Authenticate
                            </button>
                            <ImportIdentitySection
                                importIdentity={importIdentity}
                                onCloseSettings={handleCloseSettings}
                                onBeforeImport={onBeforeImport}
                            />
                        </div>
                    ) : (
                        <>
                            <ExportIdentitySection
                                exportIdentity={exportIdentity}
                                onCloseSettings={handleCloseSettings}
                                onShowToast={onShowToast} // Pass the toast callback
                            />
                            <button
                                className="settings-menu-button sign-out-button"
                                onClick={handleSignOut}
                            >
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};