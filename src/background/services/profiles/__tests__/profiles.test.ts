// src/background/services/profiles/__tests__/profiles.test.ts
import { profileService } from '../index';
import { Profile } from '../types';

describe('ProfileService', () => {
    beforeEach(() => {
        chrome.storage.local.clear();
    });

    test('should set and get profile', async () => {
        const profile: Profile = {
            uid: 'test-user',
            displayName: 'Jordan Lee',
            profilePicture: 'https://example.com/profile.jpg'
        };
        await profileService.setProfile(profile);
        const retrieved = await profileService.getProfile('test-user');
        expect(retrieved).toEqual(profile);
    });

    test('should return default profile for unknown UID', async () => {
        const retrieved = await profileService.getProfile('unknown');
        expect(retrieved).toEqual({ uid: 'unknown' });
    });
});