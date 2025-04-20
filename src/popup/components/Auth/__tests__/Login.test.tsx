// src/popup/components/Auth/__tests__/Login.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from '../Login';
import { authService } from '../../../../background/services/auth';

// Mock authService
jest.mock('../../../../background/services/auth', () => ({
    authService: {
        login: jest.fn()
    }
}));

describe('Login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.login as jest.Mock).mockResolvedValue({});
    });

    test('renders login form and submits credentials', async () => {
        render(<Login />);

        // Check initial rendering
        expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

        // Enter credentials
        fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
            target: { value: 'password123' }
        });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    test('displays error on login failure', async () => {
        (authService.login as jest.Mock).mockRejectedValue(new Error('Login failed'));
        render(<Login />);

        fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
            target: { value: 'test@example.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
            target: { value: 'password123' }
        });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText('Login failed')).toBeInTheDocument();
        });
    });
});