import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Login } from '../Login';
import { authService } from '../../../../background/services/auth';

jest.mock('../../../../background/services/auth');

describe('Login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders login form and submits credentials', async () => {
        const mockLogin = jest.spyOn(authService, 'login').mockResolvedValue();
        render(<Login />);
        expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your user ID')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText('Enter your user ID'), {
            target: { value: 'test-user' }
        });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test-user', '');
        });
    });

    test('displays error on login failure', async () => {
        jest.spyOn(authService, 'login').mockRejectedValue(new Error('Login failed'));
        render(<Login />);
        fireEvent.change(screen.getByPlaceholderText('Enter your user ID'), {
            target: { value: 'test-user' }
        });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText('Login failed')).toBeInTheDocument();
        });
    });
});