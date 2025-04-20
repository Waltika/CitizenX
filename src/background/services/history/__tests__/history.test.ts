// src/background/services/history/__tests__/history.test.ts
import { historyService } from '../index';
import { Visit } from '../index';

describe('HistoryService', () => {
    beforeEach(() => {
        chrome.storage.local.clear();
    });

    test('should add and retrieve visit', async () => {
        const url = 'https://www.example.com/?utm_source=twitter';
        await historyService.addVisit(url);
        const visits = await historyService.getVisits();
        expect(visits).toHaveLength(1);
        expect(visits[0]).toMatchObject({
            url,
            normalizedUrl: 'https://www.example.com/',
            lastVisited: expect.any(Number)
        });
    });

    test('should update existing visit', async () => {
        const url1 = 'https://www.example.com/?utm_source=twitter';
        const url2 = 'https://www.example.com/?utm_source=facebook';
        await historyService.addVisit(url1);
        await historyService.addVisit(url2);
        const visits = await historyService.getVisits();
        expect(visits).toHaveLength(1);
        expect(visits[0].url).toBe(url2);
        expect(visits[0].normalizedUrl).toBe('https://www.example.com/');
    });
});