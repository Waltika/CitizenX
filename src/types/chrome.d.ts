export {};

declare global {
    interface Chrome {
        sidePanel: {
            open: (options: { tabId: number }) => Promise<void>;
            setPanelBehavior: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>;
        };
    }
}