// src/popup/components/Notification/List.tsx
import React, { useState, useEffect } from 'react';
import { notificationService } from '../../../background/services/notifications';
import '../../styles/components/Notification.module.css';

interface Notification {
    id: string;
    message: string;
    timestamp: number;
}

export const NotificationList: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        notificationService.getNotifications().then(setNotifications);
    }, []);

    return (
        <div className="notification-list">
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
                <p>No notifications.</p>
            ) : (
                <ul>
                    {notifications.map((notification) => (
                        <li key={notification.id}>
                            {notification.message}
                            <span> ({new Date(notification.timestamp).toLocaleString()})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};