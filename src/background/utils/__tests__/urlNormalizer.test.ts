// src/background/utils/__tests__/urlNormalizer.test.ts
import { normalizeUrl } from '../urlNormalizer';

describe('URL Normalizer', () => {
    test('should remove tracking parameters', () => {
        const url = 'https://www.example.com/?utm_source=twitter&utm_medium=social&fbclid=123';
        expect(normalizeUrl(url)).toBe('https://www.example.com/');
    });

    test('should preserve pagination parameters', () => {
        const url = 'https://www.example.com/blog?page=2&offset=10';
        expect(normalizeUrl(url)).toBe('https://www.example.com/blog?page=2&offset=10');
    });

    test('should normalize localized paths', () => {
        const url = 'https://www.example.com/fr/about';
        expect(normalizeUrl(url)).toBe('https://www.example.com/about');
    });

    test('should handle case-insensitive localized paths', () => {
        const url = 'https://www.example.com/EN/contact';
        expect(normalizeUrl(url)).toBe('https://www.example.com/contact');
    });

    test('should handle invalid URLs gracefully', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const url = 'invalid-url';
        expect(normalizeUrl(url)).toBe('invalid-url');
        jest.restoreAllMocks();
    });
});