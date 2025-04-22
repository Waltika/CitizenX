// src/components/__tests__/AnnotationUI.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnnotationUI from '../AnnotationUI';
import '@testing-library/jest-dom';
import { createHelia } from 'helia'; // This will use the mock from __mocks__/helia.js

// Mock OrbitDB
jest.mock('@orbitdb/core', () => ({
    createOrbitDB: jest.fn(),
}));

describe('AnnotationUI', () => {
    const mockUrl = 'https://example.com';
    let mockDb: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock Helia instance
        const heliaInstance = {
            libp2p: {
                addEventListener: jest.fn(),
            },
        };
        (createHelia as jest.Mock).mockResolvedValue(heliaInstance);

        // Mock OrbitDB instance and database
        mockDb = {
            put: jest.fn(),
            del: jest.fn(),
            all: jest.fn(),
            events: {
                on: jest.fn(),
            },
        };
        const mockOrbitDBInstance = {
            open: jest.fn().mockResolvedValue(mockDb),
        };
        require('@orbitdb/core').createOrbitDB.mockResolvedValue(mockOrbitDBInstance);
    });

    it('renders the UI with no annotations initially', async () => {
        mockDb.all.mockResolvedValue([]);
        render(<AnnotationUI url={mockUrl} />);

        expect(screen.getByText('CitizenX Annotations')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No annotations yet.')).toBeInTheDocument();
        });
    });
});