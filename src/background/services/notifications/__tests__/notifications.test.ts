// src/background/services/notifications/__tests__/notifications.test.ts
import { notificationService } from '../index';

describe('NotificationService', () => {
    test('should create a notification', async () => {
        const message = 'Test notification';
        await notificationService.notify(message);
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                type: 'basic',
                iconUrl: '/icons/icon48.png',
                title: 'CitizenX Notification',
                message
            }),
            expect.any(Function)
        );
    });
});