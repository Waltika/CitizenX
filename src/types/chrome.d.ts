declare namespace chrome {
    namespace sidePanel {
        function open(options: { tabId?: number; windowId?: number }, callback?: () => void): void;
    }
}