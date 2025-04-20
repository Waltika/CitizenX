// src/content/components/__tests__/AnnotationCreate.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnotationCreate } from '../AnnotationCreate';
import { annotationService } from '../../../background/services/annotations';

// Mock annotationService
jest.mock('../../../background/services/annotations', () => ({
    annotationService: {
        addAnnotation: jest.fn()
    }
}));

// Mock normalizeUrl
jest.mock('../../../background/utils/urlNormalizer', () => ({
    normalizeUrl: jest.fn(url => url.replace(/\?.*/, ''))
}));

describe('AnnotationCreate', () => {
    const mockUrl = 'https://www.example.com/?utm_source=twitter';
    const mockUserId = 'test-user';

    beforeEach(() => {
        jest.clearAllMocks();
        (annotationService.addAnnotation as jest.Mock).mockResolvedValue(undefined);
    });

    test('renders annotation form and creates annotation', async () => {
        render(<AnnotationCreate url={mockUrl} userId={mockUserId} />);

        // Check initial rendering
        expect(screen.getByText('Add Annotation')).toBeInTheDocument();

        // Open form
        fireEvent.click(screen.getByText('Add Annotation'));
        expect(screen.getByPlaceholderText('Enter your annotation')).toBeInTheDocument();

        // Create annotation
        const textarea = screen.getByPlaceholderText('Enter your annotation');
        const saveButton = screen.getByText('Save Annotation');
        fireEvent.change(textarea, { target: { value: 'Test annotation' } });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(annotationService.addAnnotation).toHaveBeenCalledWith(mockUrl, 'Test annotation', mockUserId);
            expect(screen.queryByText('Save Annotation')).not.toBeInTheDocument();
        });
    });

    test('toggles form visibility', () => {
        render(<AnnotationCreate url={mockUrl} userId={mockUserId} />);

        // Form is initially hidden
        expect(screen.queryByPlaceholderText('Enter your annotation')).not.toBeInTheDocument();

        // Open form
        fireEvent.click(screen.getByText('Add Annotation'));
        expect(screen.getByText('Close')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your annotation')).toBeInTheDocument();

        // Close form
        fireEvent.click(screen.getByText('Close'));
        expect(screen.getByText('Add Annotation')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Enter your annotation')).not.toBeInTheDocument();
    });
});