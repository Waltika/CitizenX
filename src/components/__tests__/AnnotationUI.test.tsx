// src/components/__tests__/AnnotationUI.test.tsx
import React, { act } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

        // Mock useAnnotations with default empty annotations
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
        expect(screen.getByText(/2021/)).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('adds a new annotation', async () => {
        const mockHandleSaveAnnotation = jest.fn().mockResolvedValue(undefined);
        const mockSetAnnotations = jest.fn();
        const mockAnnotations = [
            { _id: '2', url: mockUrl, text: 'New annotation', timestamp: 1630000001000 },
        ];

        (useAnnotations.useAnnotations as jest.Mock).mockReturnValue({
            annotations: [],
            setAnnotations: mockSetAnnotations,
            error: null,
            handleSaveAnnotation: mockHandleSaveAnnotation,
            handleDeleteAnnotation: jest.fn(),
        });

        render(<AnnotationUI url={mockUrl} />);

        const input = screen.getByPlaceholderText('Enter annotation...');
        const saveButton = screen.getByText('Save');

        await userEvent.type(input, 'New annotation');
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(mockHandleSaveAnnotation).toHaveBeenCalledWith('New annotation');

        (useAnnotations.useAnnotations as jest.Mock).mockReturnValue({
            annotations: mockAnnotations,
            setAnnotations: mockSetAnnotations,
            error: null,
            handleSaveAnnotation: mockHandleSaveAnnotation,
            handleDeleteAnnotation: jest.fn(),
        });

        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('New annotation')).toBeInTheDocument();
        expect(screen.getByText(/2021/)).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('deletes an annotation', async () => {
        const mockHandleDeleteAnnotation = jest.fn().mockResolvedValue(undefined);
        let annotations = [
            { _id: '1', url: mockUrl, text: 'First annotation', timestamp: 1630000000000 },
        ];

        (useAnnotations.useAnnotations as jest.Mock).mockImplementation(() => ({
            annotations,
            setAnnotations: jest.fn((newAnnotations) => {
                annotations = newAnnotations;
            }),
            error: null,
            handleSaveAnnotation: jest.fn(),
            handleDeleteAnnotation: mockHandleDeleteAnnotation,
        }));

        const { rerender } = render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('First annotation')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();

        const deleteButton = screen.getByText('Delete');
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        expect(mockHandleDeleteAnnotation).toHaveBeenCalledWith('1');

        annotations = [];

        (useAnnotations.useAnnotations as jest.Mock).mockImplementation(() => ({
            annotations,
            setAnnotations: jest.fn((newAnnotations) => {
                annotations = newAnnotations;
            }),
            error: null,
            handleSaveAnnotation: jest.fn(),
            handleDeleteAnnotation: mockHandleDeleteAnnotation,
        }));

        rerender(<AnnotationUI url={mockUrl} />);

        await waitFor(() => {
            expect(screen.queryByText('First annotation')).not.toBeInTheDocument();
            expect(screen.getByText('No annotations yet.')).toBeInTheDocument();
        });
    });

    it('handles errors during initialization', async () => {
        // Mock useOrbitDB to return an error
        (useOrbitDB.useOrbitDB as jest.Mock).mockReturnValue({
            db: null,
            error: 'Failed to initialize decentralized storage',
        });

        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('CitizenX Annotations')).toBeInTheDocument();
        expect(screen.getByText('Failed to initialize decentralized storage')).toBeInTheDocument();
        expect(screen.getByText('No annotations yet.')).toBeInTheDocument();

        // Verify the Save button is disabled due to db being null
        const saveButton = screen.getByText('Save');
        expect(saveButton).toBeDisabled();
    });
});