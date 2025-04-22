// src/hooks/__tests__/useAnnotations.test.tsx
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { useAnnotations } from '../useAnnotations';
import { normalizeUrl } from '../../shared/utils/normalizeUrl';

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

// Mock normalizeUrl to return a consistent normalized URL
jest.mock('../../shared/utils/normalizeUrl', () => ({
    normalizeUrl: jest.fn((url: string) => 'https://example.com/normalized'),
}));

describe('useAnnotations', () => {
    const mockUrl = 'https://example.com/en/path?utm_source=google';
    const mockNormalizedUrl = 'https://example.com/normalized';
    const mockDb = {
        put: jest.fn(),
        del: jest.fn(), // Fixed typo: 'jenpm st.fn()' → 'jest.fn()'
        all: jest.fn(),
        events: {
            on: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        mockDb.put.mockReset();
        mockDb.del.mockReset();
        mockDb.all.mockReset();
        mockDb.events.on.mockReset();

        // Ensure normalizeUrl returns the mocked normalized URL
        (normalizeUrl as jest.Mock).mockReturnValue(mockNormalizedUrl);

        // Mock console methods to suppress logs during tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console methods after each test
        jest.restoreAllMocks();
    });

    it('initializes with empty annotations', () => {
        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        expect(result.current.annotations).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('fetches existing annotations from OrbitDB on mount', async () => {
        const mockAnnotations = [
            { _id: '1', url: mockNormalizedUrl, text: 'First annotation', timestamp: 1630000000000 },
        ];
        mockDb.all.mockResolvedValue(mockAnnotations.map((value) => ({ value })));

        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        // Simulate the update event
        await act(async () => {
            mockDb.events.on.mock.calls[0][1](); // Call the 'update' callback
        });

        await waitFor(() => {
            expect(result.current.annotations).toEqual(mockAnnotations);
        });
        expect(result.current.error).toBeNull();
    });

    it('fetches annotations from localStorage on mount', async () => {
        const mockLocalAnnotations = [
            { _id: '1', url: mockNormalizedUrl, text: 'Local annotation', timestamp: 1630000000000 },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLocalAnnotations));

        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        await waitFor(() => {
            expect(result.current.annotations).toEqual(mockLocalAnnotations);
        });
        expect(result.current.error).toBeNull();
    });

    it('saves a new annotation to OrbitDB', async () => {
        mockDb.put.mockResolvedValue(undefined);
        mockDb.all.mockResolvedValue([]); // Simulate empty DB after save

        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        const newAnnotationText = 'New annotation';
        await act(async () => {
            await result.current.handleSaveAnnotation(newAnnotationText);
        });

        expect(mockDb.put).toHaveBeenCalledWith(
            expect.objectContaining({
                url: mockNormalizedUrl,
                text: newAnnotationText,
            })
        );
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
    });

    it('falls back to localStorage when saving fails with NoPeersSubscribedToTopic', async () => {
        mockDb.put.mockRejectedValue(new Error('NoPeersSubscribedToTopic'));

        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        const newAnnotationText = 'Offline annotation';
        await act(async () => {
            await result.current.handleSaveAnnotation(newAnnotationText);
        });

        expect(mockDb.put).toHaveBeenCalled();
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'citizenx-annotations',
            expect.stringContaining('"text":"Offline annotation"')
        );
        expect(result.current.error).toBeNull();
        expect(result.current.annotations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: mockNormalizedUrl,
                    text: newAnnotationText,
                }),
            ])
        );
    });

    it('deletes an annotation from OrbitDB', async () => {
        const mockAnnotations = [
            { _id: '1', url: mockNormalizedUrl, text: 'First annotation', timestamp: 1630000000000 },
        ];
        mockDb.all
            .mockResolvedValueOnce(mockAnnotations.map((value) => ({ value }))) // Initial fetch
            .mockResolvedValueOnce([]); // After deletion
        mockDb.del.mockResolvedValue(undefined);

        const { result } = renderHook(() => useAnnotations(mockUrl, mockDb));

        // Simulate the initial fetch
        await act(async () => {
            mockDb.events.on.mock.calls[0][1](); // Call the 'update' callback
        });

        await waitFor(() => {
            expect(result.current.annotations).toEqual(mockAnnotations);
        });

        await act(async () => {
            await result.current.handleDeleteAnnotation('1');
        });

        expect(mockDb.del).toHaveBeenCalledWith('1');
        expect(result.current.annotations).toEqual([]);
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
        expect(result.current.error).toBeNull();
    });

    it('deletes an annotation from localStorage when db is null', async () => {
        const mockLocalAnnotations = [
            { _id: '1', url: mockNormalizedUrl, text: 'Local annotation', timestamp: 1630000000000 },
        ];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLocalAnnotations));

        const { result } = renderHook(() => useAnnotations(mockUrl, null));

        // Wait for useEffect to set the initial state from localStorage
        await waitFor(() => {
            expect(result.current.annotations).toEqual(mockLocalAnnotations);
        });

        // Perform the deletion
        await act(async () => {
            await result.current.handleDeleteAnnotation('1');
        });

        // Verify the state after deletion
        expect(localStorageMock.setItem).toHaveBeenCalledWith('citizenx-annotations', JSON.stringify([]));
        expect(result.current.annotations).toEqual([]);
        expect(result.current.error).toBeNull();
    });
});