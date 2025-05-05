export async function shortenUrl(longUrl: string): Promise<string> {
    try {
        const response = await fetch('https://citizen-x-bootsrap.onrender.com/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: longUrl }),
        });

        if (!response.ok) {
            throw new Error(`Failed to shorten URL: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.shortUrl;
    } catch (error) {
        console.error('Error shortening URL:', error);
        throw error;
    }
}