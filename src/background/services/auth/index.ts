// src/background/services/auth/index.ts
export interface User {
    uid: string;
    email: string;
    isAuthenticated: boolean;
}

export class AuthService {
    private storageKey = 'citizenx_auth';
    private currentUser: User | null = null;

    async login(email: string, password: string): Promise<User> {
        // Simulate authentication (replace with real auth logic)
        const user: User = {
            uid: this.generateUid(email),
            email,
            isAuthenticated: true
        };
        this.currentUser = user;
        await this.saveUser(user);
        return user;
    }

    async logout(): Promise<void> {
        this.currentUser = null;
        return new Promise((resolve) => {
            chrome.storage.local.remove(this.storageKey, () => resolve());
        });
    }

    async getCurrentUser(): Promise<User | null> {
        if (this.currentUser) return this.currentUser;
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                resolve(result[this.storageKey] || null);
            });
        });
    }

    private async saveUser(user: User): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.storageKey]: user }, () => resolve());
        });
    }

    private generateUid(email: string): string {
        // Simple UID generation (replace with real logic)
        return btoa(email).slice(0, 8);
    }
}

export const authService = new AuthService();