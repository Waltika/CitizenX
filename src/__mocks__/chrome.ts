// src/__mocks__/chrome.ts
import { jest } from '@jest/globals';

type Callback<T = any> = (result: T) => void;
export interface ChromeStorageArea {
    get: (keys: string | string[] | Record<string, any>, callback: Callback<object>) => void;
    set: (items: object, callback?: Callback<void>) => void;
    remove: (keys: string | string[], callback?: Callback<void>) => void;
    clear: (callback?: Callback<void>) => void;
}
export interface ChromeRuntime {
    sendMessage: jest.Mock;
    onMessage: { addListener: jest.Mock };
}
export interface ChromeNotifications {
    create: (id: string, options: { type: string; iconUrl: string; title: string; message: string }, callback?: () => void) => void;
}
export interface ChromeMock {
    runtime: ChromeRuntime;
    storage: { local: ChromeStorageArea; sync: ChromeStorageArea };
    notifications: ChromeNotifications;
}

// In-memory store for mock storage
let store: Record<string, any> = {};

export const chrome: ChromeMock = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: { addListener: jest.fn() }
    },
    storage: {
        local: {
            get: jest.fn((keys: string | string[] | Record<string, any>, callback: Callback<object>) => {
                const result: Record<string, any> = {};
                if (typeof keys === 'string') {
                    result[keys] = store[keys] || null;
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        result[key] = store[key] || null;
                    });
                } else {
                    Object.keys(keys as Record<string, any>).forEach(key => {
                        result[key] = store[key] || null;
                    });
                }
                callback(result);
            }),
            set: jest.fn((items, callback?: Callback<void>) => {
                Object.assign(store, items);
                callback && callback();
            }),
            remove: jest.fn((keys: string | string[], callback?: Callback<void>) => {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                keyArray.forEach(key => {
                    delete store[key];
                });
                callback && callback();
            }),
            clear: jest.fn((callback?: Callback<void>) => {
                store = {};
                callback && callback();
            })
        },
        sync: {
            get: jest.fn((keys, callback: Callback<object>) => callback({})),
            set: jest.fn((items, callback?: Callback<void>) => callback && callback()),
            remove: jest.fn((keys, callback?: Callback<void>) => callback && callback()),
            clear: jest.fn((callback?: Callback<void>) => callback && callback())
        }
    },
    notifications: {
        create: jest.fn((id, options, callback?: () => void) => callback && callback())
    }
};