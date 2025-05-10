import { Annotation, Comment } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';

type AnnotationUpdateCallback = (annotations: Annotation[]) => void;

interface CallbackEntry {
    callbacks: AnnotationUpdateCallback[];
    cleanup?: () => void;
}

export class AnnotationManager {
    private gun: any;
    private serverUrl: string = 'https://citizen-x-bootsrap.onrender.com';
    private annotationCallbacks: Map<string, CallbackEntry> = new Map();

    constructor(gun: any) {
        this.gun = gun;
    }

    private getShardKey(url: string): { domainShard: string; subShard?: string } {
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace(/\./g, '_');
        const domainShard = `annotations_${domain}`;

        const highTrafficDomains = ['google_com', 'facebook_com', 'twitter_com'];
        if (highTrafficDomains.includes(domain)) {
            const hash = this.simpleHash(normalizedUrl);
            const subShardIndex = hash % 10;
            return { domainShard, subShard: `${domainShard}_shard_${subShardIndex}` };
        }

        return { domainShard };
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private async getValidTabId(providedTabId?: number): Promise<number | undefined> {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            try {
                if (providedTabId) {
                    const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
                        chrome.tabs.get(providedTabId, (tab) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(tab);
                            }
                        });
                    });
                    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                        console.log('AnnotationManager: Provided tabId is still valid:', providedTabId);
                        return providedTabId;
                    } else {
                        console.warn('AnnotationManager: Provided tabId is invalid or restricted:', providedTabId, 'URL:', tab.url);
                    }
                }

                const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
                    chrome.tabs.query({ active: true, currentWindow: true }, resolve);
                });
                if (tabs[0]?.id) {
                    const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
                        chrome.tabs.get(tabs[0].id!, (tab) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(tab);
                            }
                        });
                    });
                    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                        console.log('AnnotationManager: Valid tabId for screenshot capture:', tab.id);
                        return tab.id;
                    } else {
                        console.warn('AnnotationManager: Cannot capture screenshot, tab URL is restricted:', tab.url);
                    }
                } else {
                    console.warn('AnnotationManager: No active tab found for screenshot capture');
                }
            } catch (error) {
                console.error('AnnotationManager: Failed to fetch or validate tabId:', error);
            }
        } else {
            console.warn('AnnotationManager: chrome.tabs API not available');
        }
        return undefined;
    }

    private async activateTab(tabId: number): Promise<void> {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            try {
                await new Promise<void>((resolve, reject) => {
                    chrome.tabs.update(tabId, { active: true }, (tab) => {
                        if (chrome.runtime.lastError) {
                            console.error('AnnotationManager: Failed to activate tab:', chrome.runtime.lastError.message);
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            console.log('AnnotationManager: Successfully activated tab:', tabId);
                            resolve();
                        }
                    });
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('AnnotationManager: Error activating tab:', error);
                throw error;
            }
        } else {
            throw new Error('chrome.tabs API not available');
        }
    }

    async captureScreenshot(providedTabId?: number, captureScreenshot: boolean = true): Promise<string | undefined> {
        if (!captureScreenshot) {
            console.log('AnnotationManager: Skipping screenshot capture as per request');
            return undefined;
        }

        const tabId = await this.getValidTabId(providedTabId);
        if (!tabId) {
            throw new Error('No valid tabId available for screenshot capture');
        }

        await this.activateTab(tabId);

        console.log('AnnotationManager: Attempting to capture screenshot for tabId:', tabId);
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error('AnnotationManager: Failed to capture screenshot:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (!dataUrl) {
                        console.error('AnnotationManager: No screenshot data returned for tabId:', tabId);
                        reject(new Error('No screenshot data returned'));
                    } else {
                        console.log('AnnotationManager: Successfully captured screenshot for tabId:', tabId);
                        resolve(dataUrl);
                    }
                });
            } else {
                console.error('AnnotationManager: chrome.tabs API not available');
                reject(new Error('chrome.tabs API not available'));
            }
        });
    }

    async saveAnnotation(annotation: Annotation, tabId?: number, captureScreenshot: boolean = true): Promise<void> {
        console.log('AnnotationManager: Saving annotation with tabId:', tabId, 'captureScreenshot:', captureScreenshot);
        if (!annotation.id || !annotation.url || !annotation.content || !annotation.author) {
            console.error('AnnotationManager: Missing required fields in annotation:', annotation);
            throw new Error('Missing required fields in annotation');
        }

        let screenshot: string | undefined;
        try {
            screenshot = await this.captureScreenshot(tabId, captureScreenshot);
            if (screenshot) {
                console.log('AnnotationManager: Captured screenshot for annotation:', annotation.id);
            }
        } catch (error) {
            console.error('AnnotationManager: Failed to capture screenshot:', error);
        }

        const { comments, ...annotationWithoutComments } = annotation;

        const updatedAnnotation: Partial<Annotation> = {
            ...annotationWithoutComments,
        };
        if (screenshot) {
            updatedAnnotation.screenshot = screenshot;
        } else {
            console.log('AnnotationManager: No screenshot included in annotation:', annotation.id);
        }

        const { domainShard, subShard } = this.getShardKey(annotation.url);
        const targetNode = subShard ? this.gun.get(subShard).get(annotation.url) : this.gun.get(domainShard).get(annotation.url);

        await new Promise<void>((resolve, reject) => {
            targetNode.get(annotation.id).put(updatedAnnotation, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save annotation:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved annotation:', updatedAnnotation);
                    resolve();
                }
            });
        });

        if (comments && comments.length > 0) {
            for (const comment of comments) {
                await this.saveComment(annotation.url, annotation.id, comment);
            }
        }
    }

    async getAnnotations(url: string, callback?: AnnotationUpdateCallback): Promise<Annotation[]> {
        const annotations: Annotation[] = [];
        const { domainShard, subShard } = this.getShardKey(url);
        const annotationNodes = [this.gun.get(domainShard).get(url)];
        if (subShard) annotationNodes.push(this.gun.get(subShard).get(url));
        const lastProcessed = new Map<string, number>();
        const debounceInterval = 2000;

        const fetchAnnotations = async (): Promise<Annotation[]> => {
            const loadedAnnotations: Set<string> = new Set();
            let hasNewData = false;

            for (const annotationNode of annotationNodes) {
                await new Promise<void>((resolve) => {
                    const onData = async (annotation: any, key: string) => {
                        if (!annotation || !key || typeof key !== 'string' || key.includes('Marker') || !annotation.id) {
                            console.warn('Skipping invalid annotation or marker:', { annotation, key });
                            return;
                        }
                        if (loadedAnnotations.has(annotation.id)) return;
                        loadedAnnotations.add(annotation.id);
                        hasNewData = true;

                        const comments: Comment[] = await new Promise((resolveComments) => {
                            const commentList: Comment[] = [];
                            const commentIds: Set<string> = new Set();
                            annotationNode.get(annotation.id).get('comments').map().once((comment: any) => {
                                if (
                                    comment &&
                                    comment.id &&
                                    comment.author &&
                                    typeof comment.author === 'string' &&
                                    comment.author.startsWith('did:') &&
                                    comment.content &&
                                    !commentIds.has(comment.id)
                                ) {
                                    commentIds.add(comment.id);
                                    const commentData: Comment = {
                                        id: comment.id,
                                        content: comment.content,
                                        author: comment.author,
                                        timestamp: comment.timestamp || Date.now(),
                                        isDeleted: comment.isDeleted || false,
                                        annotationId: comment.annotationId || annotation.id
                                    };
                                    if (!commentData.isDeleted) commentList.push(commentData);
                                }
                            });
                            setTimeout(() => resolveComments(commentList), 500);
                        });

                        const annotationData: Annotation = {
                            id: annotation.id,
                            url: annotation.url || url,
                            content: annotation.content,
                            author: annotation.author,
                            timestamp: annotation.timestamp || Date.now(),
                            comments,
                            isDeleted: annotation.isDeleted || false,
                            text: annotation.text || '',
                            screenshot: annotation.screenshot,
                        };

                        if (!annotationData.isDeleted) {
                            annotations.push(annotationData);
                            console.log('AnnotationManager: Loaded annotation:', annotationData);
                        }
                    };

                    annotationNode.map().once(onData);
                    setTimeout(() => resolve(), 2000);
                });
            }

            return hasNewData ? [...annotations] : [];
        };

        // Initial fetch
        const initialAnnotations = await fetchAnnotations();

        if (callback) {
            if (!this.annotationCallbacks.has(url)) {
                this.annotationCallbacks.set(url, { callbacks: [] });
            }
            const entry = this.annotationCallbacks.get(url)!;
            entry.callbacks.push(callback);

            const onUpdate = async (annotation: any, key: string) => {
                const now = Date.now();
                const timestamp = new Date().toISOString();
                if (!key || typeof key !== 'string' || key.includes('Marker') || !annotation || !annotation.id) {
                    console.warn(`[${timestamp}] Skipping invalid update or marker:`, { annotation, key });
                    return;
                }
                if (lastProcessed.has(key) && now - lastProcessed.get(key)! < debounceInterval) {
                    console.log(`[${timestamp}] Skipping duplicate update for key: ${key}`);
                    return;
                }
                lastProcessed.set(key, now);

                console.log(`[${timestamp}] Real-time update received for URL: ${url}, Key: ${key}, Annotation:`, annotation);

                if (annotation === null) {
                    const matchingAnnotation = annotations.find(ann => ann.id === key);
                    if (!matchingAnnotation?.isDeleted) {
                        console.log(`[${timestamp}] No deletion flag for URL: ${url}, Key: ${key}, ignoring null update`);
                        return;
                    }
                    const updatedAnnotations = annotations.filter(a => a.id !== key);
                    annotations.splice(0, annotations.length, ...updatedAnnotations);
                } else {
                    const comments: Comment[] = await new Promise((resolveComments) => {
                        const commentList: Comment[] = [];
                        const commentIds: Set<string> = new Set();
                        annotationNodes[0].get(annotation.id).get('comments').map().once((comment: any) => {
                            if (
                                comment &&
                                comment.id &&
                                comment.author &&
                                typeof comment.author === 'string' &&
                                comment.author.startsWith('did:') &&
                                comment.content &&
                                !commentIds.has(comment.id)
                            ) {
                                commentIds.add(comment.id);
                                const commentData: Comment = {
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    timestamp: comment.timestamp || Date.now(),
                                    isDeleted: comment.isDeleted || false,
                                    annotationId: ''
                                };
                                if (!commentData.isDeleted) commentList.push(commentData);
                            }
                        });
                        setTimeout(() => resolveComments(commentList), 500);
                    });

                    if (annotation.isDeleted) {
                        const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                        annotations.splice(0, annotations.length, ...updatedAnnotations);
                    } else {
                        const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                        updatedAnnotations.push({
                            id: annotation.id,
                            url: annotation.url || url,
                            content: annotation.content,
                            author: annotation.author,
                            timestamp: annotation.timestamp || Date.now(),
                            comments,
                            isDeleted: annotation.isDeleted || false,
                            text: annotation.text || '',
                            screenshot: annotation.screenshot,
                        });
                        annotations.splice(0, annotations.length, ...updatedAnnotations);
                    }
                }

                entry.callbacks.forEach(cb => cb([...annotations]));
            };

            annotationNodes.forEach(node => node.map().on(onUpdate, { change: true }));
            entry.cleanup = () => annotationNodes.forEach(node => node.map().off());
        }

        return initialAnnotations;
    }

    cleanupAnnotationsListeners(url: string): void {
        const entry = this.annotationCallbacks.get(url);
        if (entry && entry.cleanup) {
            entry.cleanup();
            this.annotationCallbacks.delete(url);
            console.log('AnnotationManager: Cleaned up listeners for URL:', url);
        }
    }

    async deleteAnnotation(url: string, id: string): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Starting deletion for URL: ${url}, ID: ${id}`);

            targetNode.get(id).put({ isDeleted: true }, (ack: any) => {
                const markTimestamp = new Date().toISOString();
                if (ack.err) {
                    console.error(`[${markTimestamp}] Failed to mark annotation as deleted for URL: ${url}, ID: ${id}, Error:`, ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log(`[${markTimestamp}] Successfully marked annotation as deleted for URL: ${url}, ID: ${id}`);
                    resolve();
                }
            });
        });
    }

    async saveComment(url: string, annotationId: string, comment: Comment): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        return new Promise((resolve, reject) => {
            targetNode.get(annotationId).get('comments').get(comment.id).put(comment, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save comment:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved comment:', comment);
                    resolve();
                }
            });
        });
    }

    async deleteComment(url: string, annotationId: string, commentId: string, userDid: string): Promise<void> {
        const response = await fetch(`${this.serverUrl}/api/comments`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-DID': userDid,
            },
            body: JSON.stringify({ url, annotationId, commentId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to delete comment');
        }
    }
}