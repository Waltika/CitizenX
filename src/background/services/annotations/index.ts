// src/background/services/annotations/index.ts
import { normalizeUrl } from '../../utils/urlNormalizer';
import { generateUUID } from '../../../shared/utils/uuid';
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

    async addAnnotation(url: string, text: string, userId: string): Promise<Annotation> {
        const normalizedUrl = normalizeUrl(url);
        const annotation: Annotation = {
            id: generateUUID(),
            url,
            normalizedUrl,
            text,
            userId,
            timestamp: Date.now()
        };
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], async (result) => {
                const annotations: Annotation[] = result[this.storageKey] || [];
                annotations.push(annotation);
                chrome.storage.local.set({ [this.storageKey]: annotations }, async () => {
                    await notificationService.notify(`New annotation on ${url} by ${userId}`);
                    resolve(annotation);
                });
            });
        });
    }

    async getAnnotations(normalizedUrl: string): Promise<Annotation[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const annotations: Annotation[] = result[this.storageKey] || [];
                resolve(annotations.filter(a => a.normalizedUrl === normalizedUrl));
            });
        });
    }
}

export const annotationService = new AnnotationService();