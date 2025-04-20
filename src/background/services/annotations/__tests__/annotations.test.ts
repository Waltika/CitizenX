// src/background/services/annotations/__tests__/annotations.test.ts
import { annotationService } from '../index';
import { Annotation } from '../index';

describe('AnnotationService', () => {
    beforeEach(() => {
        chrome.storage.local.clear();
    });

    test('should add and retrieve annotation', async () => {
        const url = 'https://www.example.com/?utm_source=twitter';
        const text = 'Great article!';
        const userId = 'test-user';
        const annotation = await annotationService.addAnnotation(url, text, userId);
        expect(annotation).toMatchObject({
            url,
            normalizedUrl: 'https://www.example.com/',
            text,
            userId,
            timestamp: expect.any(Number)
        });
        const annotations = await annotationService.getAnnotations('https://www.example.com/');
        expect(annotations).toHaveLength(1);
        expect(annotations[0]).toMatchObject({ text, userId });
    });

    test('should trigger notification on annotation', async () => {
        const url = 'https://www.example.com/';
        const text = 'Test annotation';
        const userId = 'test-user';
        await annotationService.addAnnotation(url, text, userId);
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                type: 'basic',
                iconUrl: '/icons/icon48.png',
                title: 'CitizenX Notification',
                message: `New annotation on ${url} by ${userId}`
            }),
            expect.any(Function)
        );
    });
});