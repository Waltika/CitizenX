import { useEffect } from 'react';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

export const useChromeMessageListener = (url: string) => {
    useEffect(() => {
        const setupChromeMessageListener = () => {
            const handleMessage = (message: any) => {
                if (message.type === 'HIGHLIGHT_ANNOTATION' && message.url === normalizeUrl(url)) {
                    const annotationElement = document.querySelector(`[data-annotation-id="${message.annotationId}"]`);
                    if (annotationElement) {
                        annotationElement.scrollIntoView({ behavior: 'smooth' });
                        annotationElement.classList.add('highlight');
                        setTimeout(() => annotationElement.classList.remove('highlight'), 3000);
                    }
                }
            };

            chrome.runtime.onMessage.addListener(handleMessage);
            return () => {
                chrome.runtime.onMessage.removeListener(handleMessage);
            };
        };

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            return setupChromeMessageListener();
        }
    }, [url]);
};