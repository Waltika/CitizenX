// src/background/services/annotations/__tests__/annotations.test.ts
import { AnnotationService, annotationService } from '../index';
import { notificationService } from '../../notifications';

// Mock notificationService
jest.mock('../../notifications', () => ({
    notificationService: {
        createNotification: jest.fn().mockImplementation(async (message) => {
            console.log(`notificationService.createNotification called with message: ${message}`);
            // Simulate the real createNotification logic
            const notification = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                message,
                timestamp: Date.now()
            };
            chrome.storage.local.set({ citizenx_notifications: [notification] }, () => {
                chrome.notifications.create(notification.id, {
                    type: 'basic',
                    iconUrl: '/icons/icon48.png', // Match expected iconUrl
                    title: 'CitizenX Notification',
                    message
                }, () => {});
            });
        })
    }
}));

describe('AnnotationService', () => {
    const mockUrl = 'https://www.example.com/?utm_source=twitter';
    const mockText = 'Great article!';
    const mockUserId = 'test-user';
    const mockNormalizedUrl = 'https://www.example.com/';
    const storageKey = 'citizenx_annotations';

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock chrome.storage.local
        let storedAnnotations: any[] = [];
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn().mockImplementation((keys, callback) => {
                        console.log(`chrome.storage.local.get called with keys: ${keys}`);
                        callback({ [keys[0]]: storedAnnotations });
                    }),
                    set: jest.fn().mockImplementation((data, callback) => {
                        console.log(`chrome.storage.local.set called with data: ${JSON.stringify(data)}`);
                        storedAnnotations = data[storageKey] || storedAnnotations;
                        callback();
                    })
                }
            },
            notifications: {
                create: jest.fn().mockImplementation((id, options, callback) => {
                    console.log(`chrome.notifications.create called with id: ${id}, options: ${JSON.stringify(options)}`);
                    callback();
                })
            }
        } as any;
    });

    test('should add and retrieve annotation', async () => {
        console.log('Starting test: should add and retrieve annotation');
        await annotationService.addAnnotation(mockUrl, mockText, mockUserId);
        const annotations = await annotationService.getAnnotations(mockUrl);

        console.log(`Retrieved annotations: ${JSON.stringify(annotations)}`);
        expect(annotations).toHaveLength(1);
        expect(annotations[0]).toMatchObject({
            url: mockUrl,
            normalizedUrl: mockNormalizedUrl,
            text: mockText,
            userId: mockUserId
        });
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            {
                [storageKey]: expect.arrayContaining([
                    expect.objectContaining({
                        url: mockUrl,
                        normalizedUrl: mockNormalizedUrl,
                        text: mockText,
                        userId: mockUserId
                    })
                ])
            },
            expect.any(Function)
        );
    });

    test('should trigger notification on annotation', async () => {
        console.log('Starting test: should trigger notification on annotation');
        await annotationService.addAnnotation(mockUrl, mockText, mockUserId);

        expect(notificationService.createNotification).toHaveBeenCalledWith(
            `New annotation added: ${mockText.slice(0, 20)}...`
        );
        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                type: 'basic',
                iconUrl: '/icons/icon48.png',
                title: 'CitizenX Notification',
                message: `New annotation added: ${mockText.slice(0, 20)}...`
            }),
            expect.any(Function)
        );
    });
});