// src/background/services/auth/__tests__/index.test.ts
import { authService } from '../index';
import { User } from '../index';

describe('AuthService', () => {
    beforeEach(() => {
        chrome.storage.local.clear();
    });

    test('should login and save user', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const user = await authService.login(email, password);

        expect(user).toMatchObject({
            uid: expect.any(String),
            email,
            isAuthenticated: true
        });

        const storedUser = await authService.getCurrentUser();
        expect(storedUser).toMatchObject(user);
    });

    test('should logout and clear user', async () => {
        await authService.login('test@example.com', 'password123');
        await authService.logout();

        const user = await authService.getCurrentUser();
        expect(user).toBeNull();
    });

    test('should return null for unauthenticated user', async () => {
        const user = await authService.getCurrentUser();
        expect(user).toBeNull();
    });
});