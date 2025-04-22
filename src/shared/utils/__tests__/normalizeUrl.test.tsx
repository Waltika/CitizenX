// src/shared/utils/__tests__/normalizeUrl.test.tsx
import { normalizeUrl } from '../normalizeUrl'; // Fixed path

describe('normalizeUrl', () => {
    beforeEach(() => {
        // Mock console.error to suppress logs during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console methods after each test
        jest.restoreAllMocks();
    });

    it('removes language prefixes and UTM parameters', () => {
        const url = 'https://example.com/en/about?utm_source=google&utm_medium=cpc&lang=fr';
        const normalized = normalizeUrl(url);
        expect(normalized).toBe('https://example.com/about');
    });

    it('handles URLs without language prefixes', () => {
        const url = 'https://example.com/about?utm_campaign=spring&lang=en';
        const normalized = normalizeUrl(url);
        expect(normalized).toBe('https://example.com/about');
    });

    it('handles URLs with trailing slashes', () => {
        const url = 'https://example.com/en/contact/?utm_source=google';
        const normalized = normalizeUrl(url);
        expect(normalized).toBe('https://example.com/contact');
    });

    it('preserves relevant query parameters', () => {
        const url = 'https://example.com/blog?post_id=123&utm_source=google';
        const normalized = normalizeUrl(url);
        expect(normalized).toBe('https://example.com/blog?post_id=123');
    });

    it('handles invalid URLs gracefully', () => {
        const url = 'not-a-valid-url';
        const normalized = normalizeUrl(url);
        expect(normalized).toBe('not-a-valid-url');
    });
});