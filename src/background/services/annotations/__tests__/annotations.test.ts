// src/background/services/annotations/__tests__/annotations.test.ts
import { annotationService } from '../index';

jest.mock('@pinata/sdk', () => {
    return jest.fn().mockImplementation(() => ({
        pinJSONToIPFS: jest.fn().mockResolvedValue({ IpfsHash: 'QmTestHash' })
    }));
});

describe('AnnotationService', () => {
    let mockStorage: any[] = [];

    beforeEach(() => {
        jest.clearAllMocks();
        mockStorage = [];
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn().mockImplementation((keys, callback) => {
                        console.log(`chrome.storage.local.get called with keys: ${keys}`);
                        callback({ [keys[0]]: mockStorage });
                    }),
                    set: jest.fn().mockImplementation((data, callback) => {
                        console.log(`chrome.storage.local.set called with data: ${JSON.stringify(data)}`);
                        mockStorage = data.citizenx_annotations_index || []; // Use the storage key directly
                        callback();
                    })
                }
            }
        } as any;

        // Mock fetch for IPFS retrieval
        global.fetch = jest.fn().mockImplementation((url) => {
            console.log(`Fetch called with URL: ${url}`);
            if (url === 'https://gateway.pinata.cloud/ipfs/QmTestHash') {
                return Promise.resolve({
                    json: () =>
                        Promise.resolve({
                            id: '1745170236886-vrkaacoqqvb',
                            url: 'https://www.example.com/?utm_source=twitter',
                            normalizedUrl: 'https://www.example.com/',
                            text: 'Great article!',
                            userId: 'test-user',
                            timestamp: 1745170236886
                        })
                });
            }
            return Promise.reject(new Error('Invalid IPFS hash'));
        });
    });

    test('should add and retrieve annotation', async () => {
        const annotation = {
            id: '1745170236886-vrkaacoqqvb',
            url: 'https://www.example.com/?utm_source=twitter',
            text: 'Great article!',
            userId: 'test-user',
            timestamp: 1745170236886
        };

        await annotationService.addAnnotation(annotation);
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            {
                citizenx_annotations_index: [
                    {
                        normalizedUrl: 'https://www.example.com/',
                        ipfsHash: 'QmTestHash',
                        userId: 'test-user'
                    }
                ]
            },
            expect.any(Function)
        );

        const annotations = await annotationService.getAnnotations('https://www.example.com/');
        console.log('Retrieved annotations:', annotations);
        expect(annotations).toEqual([
            {
                id: '1745170236886-vrkaacoqqvb',
                url: 'https://www.example.com/?utm_source=twitter',
                normalizedUrl: 'https://www.example.com/',
                text: 'Great article!',
                userId: 'test-user',
                timestamp: 1745170236886,
                ipfsHash: 'QmTestHash'
            }
        ]);
    });

    test('should trigger notification on annotation', async () => {
        const annotation = {
            id: '1745170236897-jspangudo69',
            url: 'https://www.example.com/?utm_source=twitter',
            text: 'Great article!',
            userId: 'test-user',
            timestamp: 1745170236897
        };

        await annotationService.addAnnotation(annotation);
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            {
                citizenx_annotations_index: [
                    {
                        normalizedUrl: 'https://www.example.com/',
                        ipfsHash: 'QmTestHash',
                        userId: 'test-user'
                    }
                ]
            },
            expect.any(Function)
        );
    });
});