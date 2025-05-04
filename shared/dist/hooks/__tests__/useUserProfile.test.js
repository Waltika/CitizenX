// src/hooks/__tests__/useUserProfile.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserProfile } from '../useUserProfile';
// Mock the useStorage hook
jest.mock('../useStorage', () => ({
    useStorage: () => ({
        storage: {
            getCurrentDID: jest.fn().mockResolvedValue(null),
            setCurrentDID: jest.fn().mockResolvedValue(undefined),
            clearCurrentDID: jest.fn().mockResolvedValue(undefined),
            getProfile: jest.fn().mockResolvedValue(null),
            saveProfile: jest.fn().mockResolvedValue(undefined),
        },
        error: null,
        isLoading: false,
    }),
}));
// Mock chrome.storage.local
const mockChromeStorage = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
};
global.chrome = {
    storage: {
        local: mockChromeStorage,
    },
};
// Mock generateDID to return a predictable DID
jest.mock('../../utils/did', () => ({
    ...jest.requireActual('../../utils/did'),
    generateDID: jest.fn().mockResolvedValue({
        did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLKq5uL3G7CLiJ',
        privateKey: 'abcdef1234567890',
    }),
    validateDID: jest.fn().mockReturnValue(true),
}));
describe('useUserProfile Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockChromeStorage.get.mockImplementation((keys, callback) => callback({}));
        mockChromeStorage.set.mockImplementation((data, callback) => callback());
        mockChromeStorage.remove.mockImplementation((keys, callback) => callback());
    });
    it('should initialize with no DID and no profile', async () => {
        const { result } = renderHook(() => useUserProfile());
        await waitFor(() => !result.current.loading, { timeout: 2000 });
        expect(result.current.did).toBe(null);
        expect(result.current.profile).toBe(null);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
    });
    it('should authenticate and generate a new DID', async () => {
        const { result } = renderHook(() => useUserProfile());
        await waitFor(() => !result.current.loading, { timeout: 2000 });
        await act(async () => {
            await result.current.authenticate();
        });
        expect(result.current.did).toBe('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLKq5uL3G7CLiJ');
        expect(result.current.error).toBe(null);
        expect(mockChromeStorage.set).toHaveBeenCalledWith({ privateKey: 'abcdef1234567890' }, expect.any(Function));
    });
    it('should fail authentication if DID generation fails', async () => {
        require('../../utils/did').generateDID.mockRejectedValueOnce(new Error('DID generation failed'));
        const { result } = renderHook(() => useUserProfile());
        await waitFor(() => !result.current.loading, { timeout: 2000 });
        await act(async () => {
            await result.current.authenticate();
        });
        expect(result.current.did).toBe(null);
        expect(result.current.error).toBe('Authentication failed');
    });
    it('should sign out and clear the DID', async () => {
        const { result } = renderHook(() => useUserProfile());
        await waitFor(() => !result.current.loading, { timeout: 2000 });
        await act(async () => {
            await result.current.authenticate();
        });
        await act(async () => {
            await result.current.signOut();
        });
        expect(result.current.did).toBe(null);
        expect(result.current.profile).toBe(null);
        expect(mockChromeStorage.remove).toHaveBeenCalledWith('privateKey', expect.any(Function));
    });
});
