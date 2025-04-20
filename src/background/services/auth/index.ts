// src/background/services/auth/index.ts
export class AuthService {
    private storageKey = 'citizenx_auth';

    async login(username: string, password: string): Promise<void> {
        // Existing login logic
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.storageKey]: { userId: 'test-user', authenticated: true } }, () => resolve());
        });
    }

    async logout(): Promise<void> {
        // Existing logout logic
        return new Promise((resolve) => {
            chrome.storage.local.remove(this.storageKey, () => resolve());
        });
    }

    async isAuthenticated(): Promise<boolean> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const authData = result[this.storageKey];
                resolve(!!authData && authData.authenticated);
            });
        });
    }

    // Add getUserId if needed
    async getUserId(): Promise<string | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const authData = result[this.storageKey];
                resolve(authData?.userId || null);
            });
        });
    }
}

export const authService = new AuthService();