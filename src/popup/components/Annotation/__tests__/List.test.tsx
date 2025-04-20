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

// Mock normalizeUrl
jest.mock('../../../../background/utils/urlNormalizer', () => ({
    normalizeUrl: jest.fn(url => url.replace(/\?.*/, ''))
}));

describe('AnnotationList', () => {
    const mockUrl = 'https://www.example.com/?utm_source=twitter';
    const mockUserId = 'test-user';
    const mockAnnotations = [
        { id: '1', url: mockUrl, normalizedUrl: 'https://www.example.com/', text: 'Great article!', userId: mockUserId, timestamp: 1234567890 }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (annotationService.getAnnotations as jest.Mock).mockResolvedValue([]);
        (annotationService.addAnnotation as jest.Mock).mockResolvedValue(undefined);
    });

    test('renders annotations and adds new annotation', async () => {
        (annotationService.getAnnotations as jest.Mock).mockResolvedValueOnce(mockAnnotations);
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);

        // Check initial rendering
        expect(screen.getByText('Annotations')).toBeInTheDocument();
        await waitFor(() => {
            // Use regex to match text content flexibly
            expect(screen.getByText(/Great article!/)).toBeInTheDocument();
            expect(screen.getByText(mockUserId)).toBeInTheDocument();
        });

        // Add new annotation
        const textarea = screen.getByPlaceholderText('Add a new annotation');
        const button = screen.getByText('Add Annotation');
        fireEvent.change(textarea, { target: { value: 'New note' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(annotationService.addAnnotation).toHaveBeenCalledWith(mockUrl, 'New note', mockUserId);
            expect(annotationService.getAnnotations).toHaveBeenCalledWith('https://www.example.com/');
        });
    });

    test('displays no annotations message when empty', async () => {
        render(<AnnotationList url={mockUrl} userId={mockUserId} />);
        await waitFor(() => {
            expect(screen.getByText('No annotations yet.')).toBeInTheDocument();
        });
    });
});