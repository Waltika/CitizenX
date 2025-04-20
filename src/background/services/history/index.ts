// src/background/services/history/index.ts
import { normalizeUrl } from '../../utils/urlNormalizer';

export interface Visit {
    url: string;
    normalizedUrl: string;
    lastVisited: number;
}

export class HistoryService {
    private storageKey = 'citizenx_history';

    async addVisit(url: string): Promise<void> {
        const normalizedUrl = normalizeUrl(url);
        const visit: Visit = {
            url,
            normalizedUrl,
            lastVisited: Date.now()
        };
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const visits: Visit[] = result[this.storageKey] || [];
                const updatedVisits = visits.filter(v => v.normalizedUrl !== normalizedUrl).concat(visit);
                chrome.storage.local.set({ [this.storageKey]: updatedVisits }, () => {
                    resolve();
                });
            });
        });
    }

    async getVisits(): Promise<Visit[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const visits: Visit[] = result[this.storageKey] || [];
                resolve(visits);
            });
        });
    }
}

export const historyService = new HistoryService();