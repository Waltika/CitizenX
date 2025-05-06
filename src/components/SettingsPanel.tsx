// src/components/SettingsPanel.tsx
import React, { useState } from 'react';
import { ImportIdentitySection } from './ImportIdentitySection';
import { ExportIdentitySection } from './ExportIdentitySection';

interface SettingsPanelProps {
    did: string | null;
    authenticate: () => Promise<void>;
    signOut: () => Promise<void>;
    exportIdentity: (passphrase: string) => Promise<string>;
    importIdentity: (data: string, passphrase: string) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
                                                                did,
                                                                authenticate,
                                                                signOut,
                                                                exportIdentity,
                                                                importIdentity,
                                                            }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleAuthenticate = async () => {
        await authenticate();
        setIsSettingsOpen(false);
    };

    const handleSignOut = async () => {
        await signOut();
        setIsSettingsOpen(false);
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
                                onCloseSettings={() => setIsSettingsOpen(false)}
                            />
                        </div>
                    ) : (
                        <>
                            <ExportIdentitySection
                                exportIdentity={exportIdentity}
                                onCloseSettings={() => setIsSettingsOpen(false)}
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