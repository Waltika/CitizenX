// src/background/services/notifications/index.ts
import { generateUUID } from '../../../shared/utils/uuid';

export class NotificationService {
    async notify(message: string): Promise<void> {
        const notificationId = generateUUID();
        return new Promise((resolve) => {
            chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: '/icons/icon48.png',
                title: 'CitizenX Notification',
                message
            }, () => {
                resolve();
            });
        });
    }
}

export const notificationService = new NotificationService();