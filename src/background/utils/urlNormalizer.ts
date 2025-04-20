// src/background/utils/urlNormalizer.ts
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.search);
        // Remove tracking parameters
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'session', 'ref', 'fbclid', 'gclid'];
        trackingParams.forEach(param => params.delete(param));
        parsed.search = params.toString();
        // Normalize localized paths (e.g., /en/, /fr/)
        parsed.pathname = parsed.pathname.replace(/^\/(en|fr|de|es|it)\//i, '/');
        return parsed.toString();
    } catch (error) {
        console.error('URL normalization failed:', error);
        return url; // Fallback to original URL
    }
}