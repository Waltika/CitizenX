import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationList } from '../List';

describe('NotificationList', () => {
    test('renders notifications', async () => {
        render(<NotificationList />);
        expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No notifications.')).toBeInTheDocument();
        });
    });

    test('displays no notifications message when empty', async () => {
        render(<NotificationList />);
        await waitFor(() => {
            expect(screen.getByText('No notifications.')).toBeInTheDocument();
        });
    });
});