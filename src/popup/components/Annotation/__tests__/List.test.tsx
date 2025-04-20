// src/popup/components/Annotation/__tests__/List.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationList } from '../List';
import { annotationService } from '../../../../background/services/annotations';

// Mock annotationService
jest.mock('../../../../background/services/annotations', () => ({
    annotationService: {
        getAnnotations: jest.fn(),
        addAnnotation: jest.fn()
    }
}));

describe('AnnotationList', () => {
    const mockAnnotations = [
        {
            id: '1',
            url: 'https://www.example.com',
            normalizedUrl: 'https://www.example.com/',
            text: 'Great article!',
            userId: 'test-user',
            timestamp: 1234567890
        }
    ];
    const mockUrl = 'https://www.example.com';
    const mockUserId = 'test-user';

    beforeEach(() => {
        jest.clearAllMocks();
        (annotationService.getAnnotations as jest.Mock).mockResolvedValue([]);
        (annotationService.addAnnotation as jest.Mock).mockResolvedValue(undefined);
    });

    test('renders annotations and adds new annotation', async () => {
        (annotationService.getAnnotations as jest.Mock).mockResolvedValueOnce(mockAnnotations);
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);

        expect(screen.getByText('Annotations')).toBeInTheDocument();
        await waitFor(() => {
            // Use regex to match partial text across elements
            expect(screen.getByText(/Great article!/)).toBeInTheDocument();
            expect(screen.getByText(/test-user/)).toBeInTheDocument();
        });

        const textarea = screen.getByPlaceholderText('Enter new annotation');
        const button = screen.getByText('Add Annotation');
        fireEvent.change(textarea, { target: { value: 'New annotation' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(annotationService.addAnnotation).toHaveBeenCalledWith(
                mockUrl,
                'New annotation',
                mockUserId
            );
        });
    });

    test('displays no annotations message when empty', async () => {
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);
        await waitFor(() => {
            expect(screen.getByText('No annotations available.')).toBeInTheDocument();
        });
    });
});