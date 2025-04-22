// src/components/__tests__/AnnotationUI.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnnotationUI from '../AnnotationUI';
import * as useOrbitDB from '../../hooks/useOrbitDB';
import * as useAnnotations from '../../hooks/useAnnotations';
import '@testing-library/jest-dom';

// Mock the custom hooks
jest.mock('../../hooks/useOrbitDB');
jest.mock('../../hooks/useAnnotations');

describe('AnnotationUI', () => {
    const mockUrl = 'https://example.com';
    const mockDb = Symbol('mock-db'); // Use a symbol to represent the db instance

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock useOrbitDB
        (useOrbitDB.useOrbitDB as jest.Mock).mockReturnValue({
            db: mockDb,
            error: null,
        });

        // Mock useAnnotations
        (useAnnotations.useAnnotations as jest.Mock).mockReturnValue({
            annotations: [],
            setAnnotations: jest.fn(),
            error: null,
            handleSaveAnnotation: jest.fn(),
            handleDeleteAnnotation: jest.fn(),
        });
    });

    it('renders the UI with no annotations initially', async () => {
        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('CitizenX Annotations')).toBeInTheDocument();
        expect(screen.getByText('No annotations yet.')).toBeInTheDocument();
    });

    it('fetches and displays existing annotations', async () => {
        // Mock useAnnotations to return existing annotations
        const mockAnnotations = [
            { _id: '1', url: mockUrl, text: 'First annotation', timestamp: 1630000000000 },
        ];
        (useAnnotations.useAnnotations as jest.Mock).mockReturnValue({
            annotations: mockAnnotations,
            setAnnotations: jest.fn(),
            error: null,
            handleSaveAnnotation: jest.fn(),
            handleDeleteAnnotation: jest.fn(),
        });

        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('CitizenX Annotations')).toBeInTheDocument();
        expect(screen.getByText('First annotation')).toBeInTheDocument();
        expect(screen.getByText(/2021/)).toBeInTheDocument(); // Timestamp
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });
});