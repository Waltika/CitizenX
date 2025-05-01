// src/shared/utils/normalizeUrl.ts
export function normalizeUrl(url: string): string {
    // Remove duplicate protocols (e.g., https://https://)
    let cleanUrl = url.replace(/^(https?:\/\/)+/, 'https://');
    // Remove trailing slashes
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    // Remove non-functional parameters (e.g., UTM parameters)
    const urlObj = new URL(cleanUrl);
    const params = new URLSearchParams(urlObj.search);
    for (const key of params.keys()) {
        if (key.startsWith('utm_')) {
            params.delete(key);
        }
    }
    urlObj.search = params.toString();
    return urlObj.toString();
}