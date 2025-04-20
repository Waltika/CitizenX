// src/popup/components/Notification/__tests__/List.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationList } from '../List';
import { notificationService } from '../../../../background/services/notifications';

// Mock notificationService
jest.mock('../../../../background/services/notifications', () => ({
    notificationService: {
        getNotifications: jest.fn()
    }
}));

describe('NotificationList', () => {
    const mockNotifications = [
        {
            id: '1',
            message: 'New annotation added',
            timestamp: 1234567890
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (notificationService.getNotifications as jest.Mock).mockResolvedValue([]);
    });

    test('renders notifications', async () => {
        (notificationService.getNotifications as jest.Mock).mockResolvedValueOnce(mockNotifications);
        render(<NotificationList />);

        expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('New annotation added')).toBeInTheDocument();
        });
    });

    test('displays no notifications message when empty', async () => {
        render(<NotificationList />);
        await waitFor(() => {
            expect(screen.getByText('No notifications.')).toBeInTheDocument();
        });
    });
});