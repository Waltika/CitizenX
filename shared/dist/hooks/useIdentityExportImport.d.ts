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
export declare const useIdentityExportImport: ({ exportIdentity, importIdentity, }: UseIdentityExportImportProps) => UseIdentityExportImportReturn;
export {};
