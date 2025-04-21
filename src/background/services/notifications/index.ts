// src/background/services/notifications/index.tsx
export interface Notification {
    id: string;
    message: string;
    timestamp: number;
}

export class NotificationService {
    private storageKey = 'citizenx_notifications';

    async createNotification(message: string): Promise<void> {
        const notification: Notification = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            message,
            timestamp: Date.now()
        };
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const notifications = (result[this.storageKey] || []) as Notification[];
                notifications.push(notification);
                chrome.storage.local.set({ [this.storageKey]: notifications }, () => {
                    chrome.notifications.create(notification.id, {
                        type: 'basic',
                        iconUrl: 'icon.png',
                        title: 'CitizenX Notification',
                        message: notification.message
                    }, () => resolve());
                });
            });
        });
    }

    async getNotifications(): Promise<Notification[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                resolve((result[this.storageKey] || []) as Notification[]);
            });
        });
    }
}

export const notificationService = new NotificationService();