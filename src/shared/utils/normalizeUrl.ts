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

        // Remove UTM parameters and other query parameters
        const params = new URLSearchParams(urlObj.search);
        const filteredParams = new URLSearchParams();
        // Keep only parameters that are relevant (e.g., page IDs, if needed)
        // For now, we'll remove all query parameters to simplify
        // If you need to keep specific parameters, you can add them here
        urlObj.searchParams.forEach((value, key) => {
            if (!key.startsWith('utm_') && !['lang', 'locale'].includes(key)) {
                filteredParams.set(key, value);
            }
        });

        // Reconstruct the normalized URL
        const normalizedUrl = `${urlObj.protocol}//${urlObj.host}${pathname}${filteredParams.toString() ? '?' + filteredParams.toString() : ''}`;
        return normalizedUrl;
    } catch (error) {
        console.error('Failed to normalize URL:', error);
        // Fallback to the original URL if normalization fails
        return url;
    }
};