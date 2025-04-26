// src/hooks/useIdentityExportImport.ts
import { useState } from 'react';

interface UseIdentityExportImportProps {
  exportIdentity: (passphrase: string) => Promise<string>;
  importIdentity: (identityData: string, passphrase: string) => Promise<void>;
}

interface UseIdentityExportImportResult {
  exportedIdentity: string;
  setExportedIdentity: React.Dispatch<React.SetStateAction<string>>;
  importData: string;
  setImportData: React.Dispatch<React.SetStateAction<string>>;
  passphrase: string;
  setPassphrase: React.Dispatch<React.SetStateAction<string>>;
  importPassphrase: string;
  setImportPassphrase: React.Dispatch<React.SetStateAction<string>>;
  importError: string;
  setImportError: React.Dispatch<React.SetStateAction<string>>;
  exportError: string;
  setExportError: React.Dispatch<React.SetStateAction<string>>;
  handleExport: () => Promise<void>;
  handleImport: () => Promise<void>;
}

export function useIdentityExportImport({
  exportIdentity,
  importIdentity,
}: UseIdentityExportImportProps): UseIdentityExportImportResult {
  const [exportedIdentity, setExportedIdentity] = useState('');
  const [importData, setImportData] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importError, setImportError] = useState('');
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    try {
      if (!passphrase) {
        setExportError('Please enter a passphrase to export your identity');
        return;
      }
      const identityData = await exportIdentity(passphrase);
      setExportedIdentity(identityData);
      setExportError('');
    } catch (err) {
      setExportError((err as Error).message);
    }
  };

  const handleImport = async () => {
    try {
      if (!importData || !importPassphrase) {
        setImportError('Please enter the identity data and passphrase');
        return;
      }
      await importIdentity(importData, importPassphrase);
      setImportData('');
      setImportPassphrase('');
      setImportError('');
      setExportedIdentity('');
    } catch (err) {
      setImportError((err as Error).message);
    }
  };

  return {
    exportedIdentity,
    setExportedIdentity,
    importData,
    setImportData,
    passphrase,
    setPassphrase,
    importPassphrase,
    setImportPassphrase,
    importError,
    setImportError,
    exportError,
    setExportError,
    handleExport,
    handleImport,
  };
}