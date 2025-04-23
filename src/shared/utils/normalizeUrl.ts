// src/shared/utils/normalizeUrl.ts
export const normalizeUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);

        // Remove language prefixes (e.g., /en/, /fr/) from the pathname
        let pathname = urlObj.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
        // Ensure pathname starts with a slash
        if (!pathname.startsWith('/')) {
            pathname = '/' + pathname;
        }

        // Remove trailing slashes
        pathname = pathname.replace(/\/+$/, '');

        // Remove all query parameters (previously filtered only specific params)
        const filteredParams = new URLSearchParams();

        // Reconstruct the normalized URL
        const normalizedUrl = `${urlObj.protocol}//${urlObj.host}${pathname}${filteredParams.toString() ? '?' + filteredParams.toString() : ''}`;
        return normalizedUrl;
    } catch (error) {
        console.error('Failed to normalize URL:', error);
        // Fallback to the original URL if normalization fails
        return url;
    }
};