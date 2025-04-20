// src/background/services/history/index.tsx
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
                const visits = (result[this.storageKey] || []) as Visit[];
                const existingVisitIndex = visits.findIndex(v => v.normalizedUrl === normalizedUrl);

                if (existingVisitIndex >= 0) {
                    visits[existingVisitIndex] = visit;
                } else {
                    visits.push(visit);
                }

                chrome.storage.local.set({ [this.storageKey]: visits }, () => resolve());
            });
        });
    }

    async getVisits(): Promise<Visit[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                resolve((result[this.storageKey] || []) as Visit[]);
            });
        });
    }
}

export const historyService = new HistoryService();