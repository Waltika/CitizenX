// src/hooks/__tests__/useOrbitDB.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useOrbitDB } from '../useOrbitDB';
import { createOrbitDB } from '@orbitdb/core';
import { createHelia } from 'helia';

// Mock dependencies
jest.mock('@orbitdb/core', () => ({
    createOrbitDB: jest.fn(),
}));
jest.mock('helia', () => ({
    createHelia: jest.fn(),
}));

describe('useOrbitDB', () => {
    const mockUrl = 'https://example.com';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock console.log and console.error to suppress logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console methods after each test
        jest.restoreAllMocks();
    });

    it('initializes OrbitDB successfully', async () => {
        // Mock Helia instance
        const mockHelia = {
            libp2p: {
                addEventListener: jest.fn(),
            },
        };
        (createHelia as jest.Mock).mockResolvedValue(mockHelia);

        // Mock OrbitDB instance and database
        const mockDb = {
            all: jest.fn(),
            events: {
                on: jest.fn(),
            },
        };
        const mockOrbitDBInstance = {
            open: jest.fn().mockResolvedValue(mockDb),
        };
        (createOrbitDB as jest.Mock).mockResolvedValue(mockOrbitDBInstance);

        const { result } = renderHook(() => useOrbitDB(mockUrl));

        // Initial state
        expect(result.current.db).toBeNull();
        expect(result.current.error).toBeNull();

        // Wait for the hook to update after initialization
        await waitFor(() => {
            expect(result.current.db).toBe(mockDb);
        });

        // Verify the hook state after initialization
        expect(result.current.db).toBe(mockDb);
        expect(result.current.error).toBeNull();
        expect(createHelia).toHaveBeenCalled();
        expect(createOrbitDB).toHaveBeenCalledWith({ ipfs: mockHelia });
        expect(mockOrbitDBInstance.open).toHaveBeenCalledWith('citizenx-annotations', { type: 'documents' });
    });

    it('sets an error when Helia initialization fails', async () => {
        // Mock Helia to fail
        (createHelia as jest.Mock).mockRejectedValue(new Error('IPFS initialization failed'));

        const { result } = renderHook(() => useOrbitDB(mockUrl));

        // Initial state
        expect(result.current.db).toBeNull();
        expect(result.current.error).toBeNull();

        // Wait for the hook to update after failure
        await waitFor(() => {
            expect(result.current.error).toBe('Failed to initialize decentralized storage');
        });

        // Verify the hook state after failure
        expect(result.current.db).toBeNull();
        expect(result.current.error).toBe('Failed to initialize decentralized storage');
    });

    it('sets an error when OrbitDB initialization fails', async () => {
        // Mock Helia instance
        const mockHelia = {
            libp2p: {
                addEventListener: jest.fn(),
            },
        };
        (createHelia as jest.Mock).mockResolvedValue(mockHelia);

        // Mock OrbitDB to fail
        (createOrbitDB as jest.Mock).mockRejectedValue(new Error('OrbitDB initialization failed'));

        const { result } = renderHook(() => useOrbitDB(mockUrl));

        // Initial state
        expect(result.current.db).toBeNull();
        expect(result.current.error).toBeNull();

        // Wait for the hook to update after failure
        await waitFor(() => {
            expect(result.current.error).toBe('Failed to initialize decentralized storage');
        });

        // Verify the hook state after failure
        expect(result.current.db).toBeNull();
        expect(result.current.error).toBe('Failed to initialize decentralized storage');
    });
});