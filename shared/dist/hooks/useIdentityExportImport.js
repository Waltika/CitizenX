import { useState, useCallback } from 'react';
export const useIdentityExportImport = ({ exportIdentity, importIdentity, }) => {
    const [exportedIdentity, setExportedIdentity] = useState('');
    const [importData, setImportData] = useState('');
    const [importError, setImportError] = useState(null);
    const [exportError, setExportError] = useState(null);
    const handleExport = useCallback(async () => {
        try {
            setExportError(null);
            const data = await exportIdentity();
            setExportedIdentity(data);
        }
        catch (err) {
            console.error('useIdentityExportImport: Export failed:', err);
            setExportError(err.message || 'Failed to export identity');
        }
    }, [exportIdentity]);
    const handleImport = useCallback(async () => {
        try {
            setImportError(null);
            await importIdentity(importData);
            setImportData('');
        }
        catch (err) {
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
