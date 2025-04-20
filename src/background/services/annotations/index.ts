// src/background/services/annotations/index.ts
import { normalizeUrl } from '../../utils/urlNormalizer';
import { notificationService } from '../notifications';

export interface Annotation {
    id: string;
    url: string;
    normalizedUrl: string;
    text: string;
    userId: string;
    timestamp: number;
}

export class AnnotationService {
    private storageKey = 'citizenx_annotations';

    async addAnnotation(url: string, text: string, userId: string): Promise<void> {
        const normalizedUrl = normalizeUrl(url);
        const annotation: Annotation = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url,
            normalizedUrl,
            text,
            userId,
            timestamp: Date.now()
        };

        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const annotations = (result[this.storageKey] || []) as Annotation[];
                annotations.push(annotation);
                chrome.storage.local.set({ [this.storageKey]: annotations }, () => {
                    notificationService.createNotification(`New annotation added: ${text.slice(0, 20)}...`);
                    resolve();
                });
            });
        });
    }

    async getAnnotations(url?: string): Promise<Annotation[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const annotations = (result[this.storageKey] || []) as Annotation[];
                if (url) {
                    const normalizedUrl = normalizeUrl(url);
                    resolve(annotations.filter(a => a.normalizedUrl === normalizedUrl));
                } else {
                    resolve(annotations);
                }
            });
        });
    }
}

export const annotationService = new AnnotationService();