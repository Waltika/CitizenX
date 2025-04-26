// src/shared/utils/normalizeUrl.ts
export function normalizeUrl(url: string | undefined): string | undefined {
    if (!url) {
        console.warn('normalizeUrl: URL is undefined or empty');
        return undefined;
    }

    try {
        const parsedUrl = new URL(url);
        const normalized = parsedUrl.hostname + parsedUrl.pathname;
        console.log('normalizeUrl: Normalized URL:', normalized);
        return normalized;
    } catch (err) {
        console.error('Failed to normalize URL:', err);
        // Fallback for URLs that cannot be parsed (e.g., chrome:// URLs)
        return url; // Return the original URL as a fallback
    }
}