// src/background/services/annotations/index.ts
import PinataSDK from '@pinata/sdk';
import { normalizeUrl } from '../../utils/urlNormalizer';
// src/background/services/annotations/index.ts
import { PINATA_API_KEY, PINATA_SECRET } from '../config';

// Use require for CommonJS compatibility, or adjust based on SDK version
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET);

export class AnnotationService {
    private storageKey = 'citizenx_annotations_index';

    async addAnnotation(annotation: {
        id: string;
        url: string;
        text: string;
        userId: string;
        timestamp: number;
    }): Promise<void> {
        const normalizedUrl = normalizeUrl(annotation.url);
        const annotationWithNormalized = { ...annotation, normalizedUrl };

        // Upload to Pinata/IPFS
        const result = await pinata.pinJSONToIPFS(annotationWithNormalized);
        const ipfsHash = result.IpfsHash;

        // Store hash in chrome.storage.local as an index
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                const index = result[this.storageKey] || [];
                index.push({ normalizedUrl, ipfsHash, userId: annotation.userId });
                chrome.storage.local.set({ [this.storageKey]: index }, () => resolve());
            });
        });
    }

    async getAnnotations(normalizedUrl: string): Promise<any[]> {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], async (result) => {
                const index = result[this.storageKey] || [];
                const matchingEntries = index.filter((entry: any) => entry.normalizedUrl === normalizedUrl);

                // Fetch annotations from IPFS via Pinata
                const annotations = [];
                for (const entry of matchingEntries) {
                    try {
                        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${entry.ipfsHash}`);
                        const data = await response.json();
                        annotations.push({ ...data, ipfsHash: entry.ipfsHash });
                    } catch (error) {
                        console.error(`Failed to fetch IPFS hash ${entry.ipfsHash}:`, error);
                    }
                }
                resolve(annotations);
            });
        });
    }
}

export const annotationService = new AnnotationService();