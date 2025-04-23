import { describe, test, expect } from '@jest/globals';
import { normalizeUrl } from '../normalizeUrl';

describe('normalizeUrl', () => {
    test('removes trailing slashes', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
        expect(normalizeUrl('https://example.com////')).toBe('https://example.com');
    });

    test('preserves single trailing slash for root path', () => {
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    });

    test('removes all query parameters', () => {
        expect(normalizeUrl('https://example.com/path?a=1&b=2')).toBe('https://example.com/path');
        expect(normalizeUrl('https://example.com/?utm_campaign=test&r=0')).toBe('https://example.com');
    });

    test('normalizes iccube.com URLs to the same base URL', () => {
        const baseUrl = 'https://www.iccube.com';
        const urls = [
            'https://www.iccube.com/',
            'https://www.iccube.com/de?utm_campaign=google',
            'https://www.iccube.com/fr?utm_campaign=google',
            'https://www.iccube.com/?r=0&utm_campaign=google',
        ];

        urls.forEach((url) => {
            expect(normalizeUrl(url)).toBe(baseUrl);
        });
    });

    test('handles invalid URLs gracefully', () => {
        const invalidUrl = 'not-a-url';
        expect(normalizeUrl(invalidUrl)).toBe(invalidUrl);
    });

    test('removes language prefixes', () => {
        expect(normalizeUrl('https://example.com/en/page')).toBe('https://example.com/page');
        expect(normalizeUrl('https://example.com/fr/')).toBe('https://example.com');
    });
});