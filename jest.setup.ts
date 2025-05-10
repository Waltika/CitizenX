// jest.setup.ts

// Mock chrome with Jest functions
global.chrome = {
    // Storage API (already implemented)
    storage: {
        AccessLevel: {
            TRUSTED_AND_UNTRUSTED_CONTEXTS: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
            TRUSTED_CONTEXTS: 'TRUSTED_CONTEXTS',
        } as const,
        local: {
            QUOTA_BYTES: 5242880, // Default Chrome storage quota (5MB)
            get: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | { [key: string]: any } | null | ((items: { [key: string]: any }) => void),
                callback?: (items: { [key: string]: any }) => void
            ): void | Promise<{ [key: string]: any }> => {
                // Handle callback-only signature: (callback: (items: { [key: string]: any }) => void): void
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback({});
                    return;
                }
                // Handle callback-based signature with keys: (keys: string | string[] | { [key: string]: any } | null, callback: (items: { [key: string]: any }) => void): void
                if (typeof callback === 'function') {
                    callback({});
                    return;
                }
                // Handle promise-based signature: (keys?: string | string[] | { [key: string]: any } | null | undefined): Promise<{ [key: string]: any }>
                return Promise.resolve({} as { [key: string]: any });
            }),
            set: jest.fn().mockImplementation((
                items: { [key: string]: any },
                callback?: () => void
            ): void | Promise<void> => {
                // Handle callback-based signature: (items: { [key: string]: any }, callback: () => void): void
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                // Handle promise-based signature: (items: { [key: string]: any }): Promise<void>
                return Promise.resolve();
            }),
            getBytesInUse: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | null | ((bytesInUse: number) => void),
                callback?: (bytesInUse: number) => void
            ): void | Promise<number> => {
                // Handle callback-only signature: (callback: (bytesInUse: number) => void): void
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback(0);
                    return;
                }
                // Handle callback-based signature with keys: (keys: string | string[] | null, callback: (bytesInUse: number) => void): void
                if (typeof callback === 'function') {
                    callback(0);
                    return;
                }
                // Handle promise-based signature: (keys?: string | string[] | null): Promise<number>
                return Promise.resolve(0);
            }),
            clear: jest.fn().mockImplementation((
                callback?: () => void
            ): void | Promise<void> => {
                // Handle callback-based signature: (callback: () => void): void
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                // Handle promise-based signature: (): Promise<void>
                return Promise.resolve();
            }),
            remove: jest.fn().mockImplementation((
                keys: string | string[],
                callback?: () => void
            ): void | Promise<void> => {
                // Handle callback-based signature: (keys: string | string[], callback: () => void): void
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                // Handle promise-based signature: (keys: string | string[]): Promise<void>
                return Promise.resolve();
            }),
            setAccessLevel: jest.fn().mockImplementation((
                accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS" },
                callback?: () => void
            ): void | Promise<void> => {
                // Handle callback-based signature: (accessOptions: { accessLevel: AccessLevel }, callback: () => void): void
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                // Handle promise-based signature: (accessOptions: { accessLevel: AccessLevel }): Promise<void>
                return Promise.resolve();
            }),
            onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
                hasListeners: jest.fn(),
            } as unknown as chrome.events.Event<(changes: { [key: string]: chrome.storage.StorageChange }) => void>,
        },
        sync: {
            QUOTA_BYTES: 102400, // Default Chrome sync storage quota (100KB)
            QUOTA_BYTES_PER_ITEM: 8192, // 8KB per item
            MAX_ITEMS: 512, // Maximum number of items
            MAX_WRITE_OPERATIONS_PER_HOUR: 1800, // Default Chrome sync write limit per hour
            MAX_WRITE_OPERATIONS_PER_MINUTE: 120, // Default Chrome sync write limit per minute
            MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: 1000, // Default Chrome sync sustained write limit
            get: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | { [key: string]: any } | null | ((items: { [key: string]: any }) => void),
                callback?: (items: { [key: string]: any }) => void
            ): void | Promise<{ [key: string]: any }> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback({});
                    return;
                }
                if (typeof callback === 'function') {
                    callback({});
                    return;
                }
                return Promise.resolve({} as { [key: string]: any });
            }),
            set: jest.fn().mockImplementation((
                items: { [key: string]: any },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            getBytesInUse: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | null | ((bytesInUse: number) => void),
                callback?: (bytesInUse: number) => void
            ): void | Promise<number> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback(0);
                    return;
                }
                if (typeof callback === 'function') {
                    callback(0);
                    return;
                }
                return Promise.resolve(0);
            }),
            clear: jest.fn().mockImplementation((
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            remove: jest.fn().mockImplementation((
                keys: string | string[],
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            setAccessLevel: jest.fn().mockImplementation((
                accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS" },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
                hasListeners: jest.fn(),
            } as unknown as chrome.events.Event<(changes: { [key: string]: chrome.storage.StorageChange }) => void>,
        },
        managed: {
            get: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | { [key: string]: any } | null | ((items: { [key: string]: any }) => void),
                callback?: (items: { [key: string]: any }) => void
            ): void | Promise<{ [key: string]: any }> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback({});
                    return;
                }
                if (typeof callback === 'function') {
                    callback({});
                    return;
                }
                return Promise.resolve({} as { [key: string]: any });
            }),
            set: jest.fn().mockImplementation((
                items: { [key: string]: any },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            getBytesInUse: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | null | ((bytesInUse: number) => void),
                callback?: (bytesInUse: number) => void
            ): void | Promise<number> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback(0);
                    return;
                }
                if (typeof callback === 'function') {
                    callback(0);
                    return;
                }
                return Promise.resolve(0);
            }),
            clear: jest.fn().mockImplementation((
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            remove: jest.fn().mockImplementation((
                keys: string | string[],
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            setAccessLevel: jest.fn().mockImplementation((
                accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS" },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
                hasListeners: jest.fn(),
            } as unknown as chrome.events.Event<(changes: { [key: string]: chrome.storage.StorageChange }) => void>,
        },
        session: {
            QUOTA_BYTES: 1048576, // Default Chrome session storage quota (1MB)
            get: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | { [key: string]: any } | null | ((items: { [key: string]: any }) => void),
                callback?: (items: { [key: string]: any }) => void
            ): void | Promise<{ [key: string]: any }> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback({});
                    return;
                }
                if (typeof callback === 'function') {
                    callback({});
                    return;
                }
                return Promise.resolve({} as { [key: string]: any });
            }),
            set: jest.fn().mockImplementation((
                items: { [key: string]: any },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            getBytesInUse: jest.fn().mockImplementation((
                keysOrCallback?: string | string[] | null | ((bytesInUse: number) => void),
                callback?: (bytesInUse: number) => void
            ): void | Promise<number> => {
                if (typeof keysOrCallback === 'function') {
                    keysOrCallback(0);
                    return;
                }
                if (typeof callback === 'function') {
                    callback(0);
                    return;
                }
                return Promise.resolve(0);
            }),
            clear: jest.fn().mockImplementation((
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            remove: jest.fn().mockImplementation((
                keys: string | string[],
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            setAccessLevel: jest.fn().mockImplementation((
                accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS" },
                callback?: () => void
            ): void | Promise<void> => {
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                return Promise.resolve();
            }),
            onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
                hasListeners: jest.fn(),
            } as unknown as chrome.events.Event<(changes: { [key: string]: chrome.storage.StorageChange }) => void>,
        },
        onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
            hasListener: jest.fn(),
            hasListeners: jest.fn(),
        } as unknown as chrome.events.Event<(changes: { [key: string]: chrome.storage.StorageChange }) => void>,
    },
    // Stub other required chrome namespace properties
    cast: {} as any,
    accessibilityFeatures: {} as any,
    action: {} as any,
    alarms: {} as any,
    runtime: {
        id: 'mock-extension-id',
        getManifest: jest.fn().mockReturnValue({ version: '1.0.0' }),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
            hasListener: jest.fn(),
            hasListeners: jest.fn(),
        } as unknown as chrome.events.Event<(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void>,
    } as any,
    tabs: {
        query: jest.fn().mockImplementation((queryInfo: chrome.tabs.QueryInfo, callback: (result: chrome.tabs.Tab[]) => void) => {
            callback([]);
        }),
        get: jest.fn().mockImplementation((tabId: number, callback: (tab: chrome.tabs.Tab) => void) => {
            callback({ id: tabId, url: 'https://example.com' } as chrome.tabs.Tab);
        }),
        update: jest.fn().mockImplementation((tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback?: (tab?: chrome.tabs.Tab) => void) => {
            if (callback) callback({ id: tabId, url: 'https://example.com' } as chrome.tabs.Tab);
        }),
        captureVisibleTab: jest.fn().mockImplementation((options: chrome.tabs.CaptureVisibleTabOptions, callback: (dataUrl: string) => void) => {
            callback('mock-data-url');
        }),
    } as any,
    // Add stubs for remaining required chrome APIs
    browser: {} as any,
    browsingData: {} as any,
    contentSettings: {} as any,
    debugger: {} as any,
    declarativeContent: {} as any,
    declarativeNetRequest: {} as any,
    declarativeWebRequest: {} as any,
    desktopCapture: {} as any,
    devtools: {} as any,
    documentScan: {} as any,
    dom: {} as any,
    enterprise: {} as any,
    fileBrowserHandler: {} as any,
    fileSystemProvider: {} as any,
    fontSettings: {} as any,
    gcm: {} as any,
    input: {} as any,
    instanceID: {} as any,
    loginState: {} as any,
    networking: {
        config: {} as any,
    } as any,
    offscreen: {} as any,
    omnibox: {} as any,
    pageCapture: {} as any,
    platformKeys: {} as any,
    power: {} as any,
    printerProvider: {} as any,
    serial: {} as any,
    scriptBadge: {} as any,
    sidePanel: {} as any,
    socket: {} as any,
    tabCapture: {} as any,
    tabGroups: {} as any,
    tts: {} as any,
    ttsEngine: {} as any,
    userScripts: {} as any,
    vpnProvider: {} as any,
    wallpaper: {} as any,
    webstore: {} as any,
    // Add minimal stubs for other required chrome APIs (already included earlier, but ensuring completeness)
    browserAction: {} as any,
    bookmarks: {} as any,
    commands: {} as any,
    contextMenus: {} as any,
    cookies: {} as any,
    downloads: {} as any,
    extension: {} as any,
    history: {} as any,
    i18n: {} as any,
    identity: {} as any,
    idle: {} as any,
    management: {} as any,
    notifications: {} as any,
    pageAction: {} as any,
    permissions: {} as any,
    privacy: {} as any,
    proxy: {} as any,
    scripting: {} as any,
    search: {} as any,
    sessions: {} as any,
    system: {} as any,
    topSites: {} as any,
    webNavigation: {} as any,
    webRequest: {} as any,
    windows: {} as any,
};

console.log('Jest setup: chrome.storage.local, sync, managed, session, and global mocks applied');