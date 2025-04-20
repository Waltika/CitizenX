// src/popup/components/Settings/__tests__/Profile.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Profile } from '../Profile';
import { profileService } from '../../../../background/services/profiles';

// Mock profileService
jest.mock('../../../../background/services/profiles', () => ({
    profileService: {
        getProfile: jest.fn(),
        setProfile: jest.fn()
    }
}));

describe('Profile', () => {
    const mockUserId = 'test-user';
    const mockProfile = {
        uid: mockUserId,
        displayName: 'Jordan Lee',
        profilePicture: 'https://example.com/profile.jpg'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (profileService.getProfile as jest.Mock).mockResolvedValue({ uid: mockUserId });
        (profileService.setProfile as jest.Mock).mockResolvedValue(undefined);
    });

    test('renders profile and updates fields', async () => {
        (profileService.getProfile as jest.Mock).mockResolvedValueOnce(mockProfile);
        render(<Profile userId={mockUserId} />);

        // Check initial rendering
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByDisplayValue('Jordan Lee')).toBeInTheDocument();
            expect(screen.getByDisplayValue('https://example.com/profile.jpg')).toBeInTheDocument();
        });

        // Update profile
        const displayNameInput = screen.getByPlaceholderText('Enter your display name');
        const profilePictureInput = screen.getByPlaceholderText('Enter image URL');
        const button = screen.getByText('Save Profile');
        fireEvent.change(displayNameInput, { target: { value: 'Alex Smith' } });
        fireEvent.change(profilePictureInput, { target: { value: 'https://example.com/new.jpg' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(profileService.setProfile).toHaveBeenCalledWith({
                uid: mockUserId,
                displayName: 'Alex Smith',
                profilePicture: 'https://example.com/new.jpg'
            });
        });
    });

    test('displays empty fields for new profile', async () => {
        render(<Profile userId={mockUserId} />);
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter your display name')).toHaveValue('');
            expect(screen.getByPlaceholderText('Enter image URL')).toHaveValue('');
        });
    });
});