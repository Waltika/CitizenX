// src/content/components/__tests__/AuthWrapper.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthWrapper } from '../AuthWrapper';
import { authService } from '../../../background/services/auth';
import { AnnotationCreate } from '../AnnotationCreate';
import { AnnotationDisplay } from '../AnnotationDisplay';

// Mock authService
jest.mock('../../../background/services/auth', () => ({
    authService: {
        getCurrentUser: jest.fn()
    }
}));

// Mock AnnotationCreate and AnnotationDisplay
jest.mock('../AnnotationCreate', () => ({
    AnnotationCreate: jest.fn(() => <div>AnnotationCreate</div>)
}));
jest.mock('../AnnotationDisplay', () => ({
    AnnotationDisplay: jest.fn(() => <div>AnnotationDisplay</div>)
}));

describe('AuthWrapper', () => {
    const mockUrl = 'https://www.example.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders loading state initially', () => {
        (authService.getCurrentUser as jest.Mock).mockReturnValue(new Promise(() => {}));
        render(<AuthWrapper url={mockUrl} />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('renders login prompt when unauthenticated', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);
        render(<AuthWrapper url={mockUrl} />);
        await waitFor(() => {
            expect(screen.getByText('Please log in to view or create annotations.')).toBeInTheDocument();
        });
    });

    test('renders annotation components when authenticated', async () => {
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
        render(<AuthWrapper url={mockUrl} />);
        await waitFor(() => {
            expect(AnnotationCreate).toHaveBeenCalledWith(
                { url: mockUrl, userId: 'test-user' },
                expect.anything()
            );
            expect(AnnotationDisplay).toHaveBeenCalledWith(
                { url: mockUrl },
                expect.anything()
            );
        });
    });
});