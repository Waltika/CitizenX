// src/background/services/notifications/__tests__/notifications.test.ts
import { notificationService } from '../index';

describe('NotificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock chrome.storage.local and chrome.notifications
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn().mockImplementation((keys, callback) => callback({ [keys[0]]: [] })),
                    set: jest.fn().mockImplementation((data, callback) => callback())
                }
            },
            notifications: {
                create: jest.fn().mockImplementation((id, options, callback) => {
                    console.log(`chrome.notifications.create called with id: ${id}, options: ${JSON.stringify(options)}`);
                    callback();
                })
            }
        } as any;
    });

    test('should create a notification', async () => {
        const message = 'Test notification';
        await notificationService.createNotification(message);

        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'CitizenX Notification',
                message: message
            }),
            expect.any(Function)
        );
    });
});