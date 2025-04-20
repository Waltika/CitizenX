// src/popup/components/Auth/__tests__/Logout.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Logout } from '../Logout';
import { authService } from '../../../../background/services/auth';

// Mock authService
jest.mock('../../../../background/services/auth', () => ({
    authService: {
        logout: jest.fn()
    }
}));

describe('Logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.logout as jest.Mock).mockResolvedValue(undefined);
    });

    test('renders logout button and triggers logout', async () => {
        render(<Logout />);

        // Check initial rendering
        expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

        // Click logout button
        fireEvent.click(screen.getByRole('button', { name: /logout/i }));

        await waitFor(() => {
            expect(authService.logout).toHaveBeenCalled();
        });
    });
});