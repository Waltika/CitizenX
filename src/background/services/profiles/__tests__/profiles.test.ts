import { ProfileService, profileService } from '../index';

// Mock chrome.storage.local
const mockStorage = {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn()
};

global.chrome = {
    storage: {
        local: mockStorage
    }
} as any;

describe('ProfileService', () => {
    beforeEach(() => {
        mockStorage.clear.mockClear();
        mockStorage.get.mockClear();
        mockStorage.set.mockClear();
    });

    test('should set and get profile', async () => {
        const profile = {
            uid: 'test-user',
            displayName: 'Test User',
            profilePicture: 'https://example.com/avatar.png'
        };
        mockStorage.get.mockImplementation((keys: string[], callback: (data: Record<string, any>) => void) => {
            callback({ citizenx_profile: {} });
        });
        mockStorage.set.mockImplementation((data: Record<string, any>, callback: () => void) => {
            mockStorage.get.mockImplementation((keys: string[], callback: (data: Record<string, any>) => void) => {
                callback(data); // Simulate updated storage
            });
            callback();
        });

        await profileService.setProfile(profile);
        const retrievedProfile = await profileService.getProfile('test-user');

        expect(mockStorage.set).toHaveBeenCalledWith(
            expect.objectContaining({
                citizenx_profile: expect.objectContaining({
                    'test-user': profile
                })
            }),
            expect.any(Function)
        );
        expect(retrievedProfile).toEqual(profile);
    });

    test('should return default profile for unknown UID', async () => {
        mockStorage.get.mockImplementation((keys: string[], callback: (data: Record<string, any>) => void) => {
            callback({ citizenx_profile: {} });
        });

        const profile = await profileService.getProfile('unknown-user');
        expect(profile).toEqual({ uid: 'unknown-user' });
    });
});