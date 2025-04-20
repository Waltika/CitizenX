// src/content/components/__tests__/AnnotationDisplay.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationDisplay } from '../AnnotationDisplay';
import { annotationService } from '../../../background/services/annotations';

// Mock annotationService
jest.mock('../../../background/services/annotations', () => ({
    annotationService: {
        getAnnotations: jest.fn()
    }
}));

// Mock normalizeUrl
jest.mock('../../../background/utils/urlNormalizer', () => ({
    normalizeUrl: jest.fn(url => url.replace(/\?.*/, ''))
}));

describe('AnnotationDisplay', () => {
    const mockUrl = 'https://www.example.com/?utm_source=twitter';
    const mockAnnotations = [
        {
            id: '1',
            url: mockUrl,
            normalizedUrl: 'https://www.example.com/',
            text: 'Great article!',
            userId: 'test-user',
            timestamp: 1234567890
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (annotationService.getAnnotations as jest.Mock).mockResolvedValue([]);
    });

    test('renders annotations when toggled', async () => {
        (annotationService.getAnnotations as jest.Mock).mockResolvedValueOnce(mockAnnotations);
        render(<AnnotationDisplay url={mockUrl} />);

        // Check initial rendering
        expect(screen.getByText('Show Annotations')).toBeInTheDocument();

        // Toggle visibility
        fireEvent.click(screen.getByText('Show Annotations'));
        await waitFor(() => {
            expect(screen.getByText(/Great article!/)).toBeInTheDocument();
            expect(screen.getByText('test-user')).toBeInTheDocument();
            expect(screen.getByText('Hide Annotations')).toBeInTheDocument();
        });
    });

    test('displays no annotations message when empty', async () => {
        render(<AnnotationDisplay url={mockUrl} />);
        fireEvent.click(screen.getByText('Show Annotations'));
        await waitFor(() => {
            expect(screen.getByText('No annotations for this page.')).toBeInTheDocument();
        });
    });
});