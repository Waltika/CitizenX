import { normalizeUrl } from '../../utils/urlNormalizer';

interface Annotation {
    id: string;
    content: string;
    author: string;
    timestamp: string;
    comments: Comment[];
    pageCid: string;
}

interface Comment {
    id: string;
    content: string;
    author: string;
    timestamp: string;
}

const annotationCache: { [url: string]: Annotation[] } = {};

export const annotationService = {
    async getAnnotations(url: string): Promise<Annotation[]> {
        return new Promise((resolve) => {
            const normalizedUrl = normalizeUrl(url);
            chrome.runtime.sendMessage({ action: 'getAnnotations', url: normalizedUrl }, (response) => {
                resolve(response.annotations || []);
            });
            chrome.runtime.sendMessage({
                action: 'requestAnnotations',
                url: normalizedUrl,
            });
        });
    },

    async addAnnotation(annotation: Annotation): Promise<void> {
        return new Promise((resolve, reject) => {
            const normalizedUrl = normalizeUrl(annotation.pageCid);
            if (!annotationCache[normalizedUrl]) {
                annotationCache[normalizedUrl] = [];
            }
            annotationCache[normalizedUrl].push(annotation);
            chrome.runtime.sendMessage(
                { action: 'addAnnotation', annotation },
                (response) => {
                    if (response.success) {
                        resolve();
                    } else {
                        reject(new Error('Failed to add annotation'));
                    }
                }
            );
        });
    },
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getAnnotations') {
        const normalizedUrl = normalizeUrl(msg.url);
        sendResponse({ annotations: annotationCache[normalizedUrl] || [] });
        return true;
    } else if (msg.action === 'addAnnotation') {
        sendResponse({ success: true });
        return true;
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'receiveAnnotations') {
        const normalizedUrl = normalizeUrl(msg.url);
        annotationCache[normalizedUrl] = msg.annotations;
        chrome.runtime.sendMessage({
            action: 'updateAnnotations',
            url: normalizedUrl,
            annotations: msg.annotations,
        });
    }
});