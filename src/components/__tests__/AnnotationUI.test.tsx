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

// Mock localStorage
const localStorageMock = (function () {
    let store: { [key: string]: string } = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('AnnotationUI', () => {
    const mockUrl = 'https://example.com';
    const mockDb = {
        put: jest.fn(),
        all: jest.fn(),
        events: {
            on: jest.fn(),
        },
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        localStorageMock.clear();

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
        (useOrbitDB.useOrbitDB as jest.Mock).mockReturnValue({
            db: null,
            error: 'Failed to initialize decentralized storage',
        });

        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('CitizenX Annotations')).toBeInTheDocument();
        expect(screen.getByText('Failed to initialize decentralized storage')).toBeInTheDocument();
        expect(screen.getByText('No annotations yet.')).toBeInTheDocument();

        const saveButton = screen.getByText('Save');
        expect(saveButton).toBeDisabled();
    });

    it('falls back to localStorage when no peers are available', async () => {
        // Mock db.put to reject with NoPeersSubscribedToTopic error
        mockDb.put.mockRejectedValue(new Error('NoPeersSubscribedToTopic'));

        // Initial mock for useAnnotations with empty annotations
        let annotations: any[] = [];
        const setAnnotationsMock = jest.fn((newAnnotations) => {
            annotations = newAnnotations;
        });

        // Mock useAnnotations with a real handleSaveAnnotation
        (useAnnotations.useAnnotations as jest.Mock).mockImplementation(() => {
            const handleSaveAnnotation = async (text: string) => {
                const doc = {
                    _id: Date.now().toString(),
                    url: mockUrl,
                    text: text.trim(),
                    timestamp: Date.now(),
                };
                try {
                    await mockDb.put(doc);
                    const docs = await mockDb.all();
                    setAnnotationsMock(docs.map((d: any) => d.value));
                } catch (error: unknown) {
                    const err = error as Error;
                    if (err.message.includes('NoPeersSubscribedToTopic')) {
                        const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                        localAnnotations.push(doc);
                        localStorage.setItem('citizenx-annotations', JSON.stringify(localAnnotations));
                        setAnnotationsMock(localAnnotations);
                        mockDb.events.on.mockImplementation((event: string, callback: () => void) => {
                            if (event === 'peer') callback();
                        });
                    } else {
                        throw error; // Let other errors propagate to fail the test
                    }
                }
            };

            return {
                annotations,
                setAnnotations: setAnnotationsMock,
                error: null,
                handleSaveAnnotation,
                handleDeleteAnnotation: jest.fn(),
            };
        });

        render(<AnnotationUI url={mockUrl} />);

        const input = screen.getByPlaceholderText('Enter annotation...');
        const saveButton = screen.getByText('Save');

        await userEvent.type(input, 'Offline annotation');
        await act(async () => {
            fireEvent.click(saveButton);
        });

        // Verify that localStorage.setItem was called
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'citizenx-annotations',
            expect.stringContaining('"text":"Offline annotation"')
        );

        // Verify the annotation is displayed
        await waitFor(() => {
            expect(screen.getByText('Offline annotation')).toBeInTheDocument();
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });
    });
});