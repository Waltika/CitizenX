import { useState, useCallback } from 'react';

interface UseIdentityExportImportProps {
  exportIdentity: () => Promise<string>;
  importIdentity: (data: string) => Promise<void>;
}

interface UseIdentityExportImportReturn {
  exportedIdentity: string;
  importData: string;
  setImportData: (data: string) => void;
  importError: string | null;
  exportError: string | null;
  handleExport: () => Promise<void>;
  handleImport: () => Promise<void>;
}

export const useIdentityExportImport = ({
                                          exportIdentity,
                                          importIdentity,
                                        }: UseIdentityExportImportProps): UseIdentityExportImportReturn => {
  const [exportedIdentity, setExportedIdentity] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    try {
      setExportError(null);
      const data = await exportIdentity();
      setExportedIdentity(data);
    } catch (err: any) {
      console.error('useIdentityExportImport: Export failed:', err);
      setExportError(err.message || 'Failed to export identity');
    }
  }, [exportIdentity]);

  const handleImport = useCallback(async () => {
    try {
      setImportError(null);
      await importIdentity(importData);
      setImportData('');
    } catch (err: any) {
      console.error('useIdentityExportImport: Import failed:', err);
      setImportError(err.message || 'Failed to import identity');
    }
  }, [importIdentity, importData]);

  return {
    exportedIdentity,
    importData,
    setImportData,
    importError,
    exportError,
    handleExport,
    handleImport,
  };
};