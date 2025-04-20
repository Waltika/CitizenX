// src/background/services/auth/__tests__/index.test.ts
import { AuthService, authService } from '../index';

describe('AuthService', () => {
    const storageKey = 'citizenx_auth';
    const mockUsername = 'test-user';
    const mockPassword = 'password123';

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock chrome.storage.local
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn().mockImplementation((keys, callback) => {
                        console.log(`chrome.storage.local.get called with keys: ${keys}`);
                        callback({ [keys[0]]: null });
                    }),
                    set: jest.fn().mockImplementation((data, callback) => {
                        console.log(`chrome.storage.local.set called with data: ${JSON.stringify(data)}`);
                        callback();
                    }),
                    remove: jest.fn().mockImplementation((keys, callback) => {
                        console.log(`chrome.storage.local.remove called with keys: ${keys}`);
                        callback();
                    })
                }
            }
        } as any;
    });

    test('should login and store user data', async () => {
        await authService.login(mockUsername, mockPassword);
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            {
                [storageKey]: expect.objectContaining({
                    userId: mockUsername,
                    authenticated: true
                })
            },
            expect.any(Function)
        );
    });

    test('should logout and remove user data', async () => {
        await authService.logout();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(storageKey, expect.any(Function));
    });

    test('should check authentication status', async () => {
        // Mock authenticated state
        global.chrome.storage.local.get = jest.fn().mockImplementation((keys, callback) => {
            console.log(`chrome.storage.local.get called with keys: ${keys}`);
            callback({ [keys[0]]: { userId: mockUsername, authenticated: true } });
        });

        const isAuthenticated = await authService.isAuthenticated();
        expect(chrome.storage.local.get).toHaveBeenCalledWith([storageKey], expect.any(Function));
        expect(isAuthenticated).toBe(true);
    });
});