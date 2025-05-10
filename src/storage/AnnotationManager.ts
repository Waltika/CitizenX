import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { Annotation, Comment } from '@/types';
import SEA from 'gun/sea';

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
        console.log('AnnotationManager: Initialized with SEA:', !!this.gun.SEA);
        if (!this.gun.SEA) {
            console.warn('AnnotationManager: Gun.js SEA module not available, using direct SEA import');
        }
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

    private generateNonce(): string {
        return Math.random().toString(36).substring(2) + Date.now();
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

    async saveAnnotation(annotation: Annotation, tabId?: number, captureScreenshot: boolean = true, did?: string, keyPair?: { pub: string; priv: string }): Promise<void> {
        console.log('AnnotationManager: Saving annotation with tabId:', tabId, 'captureScreenshot:', captureScreenshot, 'did:', did);
        if (!annotation.id || !annotation.url || !annotation.content || !annotation.author) {
            console.error('AnnotationManager: Missing required fields in annotation:', annotation);
            throw new Error('Missing required fields in annotation');
        }
        if (!did || !keyPair) {
            console.error('AnnotationManager: DID and keyPair are required for signing');
            throw new Error('DID and keyPair are required for signing');
        }
        if (!keyPair.pub || !keyPair.priv || typeof keyPair.pub !== 'string' || typeof keyPair.priv !== 'string' || keyPair.pub.length === 0 || keyPair.priv.length === 0) {
            console.error('AnnotationManager: Invalid or incomplete keyPair:', keyPair);
            throw new Error('Invalid or incomplete keyPair: Both pub and priv must be non-empty strings');
        }

        const sea = this.gun.SEA || SEA;
        if (!sea) {
            console.error('AnnotationManager: No SEA module available');
            throw new Error('SEA module not loaded');
        }

        const nonce = this.generateNonce();
        const dataToSign = {
            id: annotation.id,
            url: annotation.url,
            content: annotation.content,
            author: annotation.author,
            timestamp: annotation.timestamp,
            nonce
        };

        let signature: string;
        try {
            console.log('AnnotationManager: Attempting to sign annotation with keyPair:', {
                pub: keyPair.pub.slice(0, 4) + '...',
                priv: keyPair.priv.slice(0, 4) + '...'
            });
            signature = await sea.sign(JSON.stringify(dataToSign), keyPair);
            if (!signature) {
                console.error('AnnotationManager: Signature generation returned empty result');
                throw new Error('Signature generation returned empty result');
            }
            console.log('AnnotationManager: Successfully generated signature:', signature.slice(0, 10) + '...');
        } catch (error) {
            console.error('AnnotationManager: Failed to sign annotation:', error);
            throw new Error(`Failed to sign annotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            signature,
            nonce
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
                console.log('AnnotationManager: Gun put response:', ack);
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
                await this.saveComment(annotation.url, annotation.id, comment, did, keyPair);
            }
        }
    }

    async saveComment(url: string, annotationId: string, comment: Comment, did?: string, keyPair?: { pub: string; priv: string }): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);

        if (!did || !keyPair) {
            console.error('AnnotationManager: DID and keyPair are required for signing comment');
            throw new Error('DID and keyPair are required for signing');
        }

        const sea = this.gun.SEA || SEA;
        if (!sea) {
            console.error('AnnotationManager: No SEA module available');
            throw new Error('SEA module not loaded');
        }

        const nonce = this.generateNonce();
        const dataToSign = {
            id: comment.id,
            content: typeof comment.content === 'string' ? comment.content : comment.content.__html,
            author: comment.author,
            timestamp: comment.timestamp,
            annotationId: comment.annotationId,
            nonce
        };

        let signature: string;
        try {
            console.log('AnnotationManager: Attempting to sign comment with keyPair:', {
                pub: keyPair.pub.slice(0, 4) + '...',
                priv: keyPair.priv.slice(0, 4) + '...'
            });
            signature = await sea.sign(JSON.stringify(dataToSign), keyPair);
            if (!signature) {
                console.error('AnnotationManager: Comment signature generation returned empty result');
                throw new Error('Comment signature generation returned empty result');
            }
            console.log('AnnotationManager: Successfully generated comment signature:', signature.slice(0, 10) + '...');
        } catch (error) {
            console.error('AnnotationManager: Failed to sign comment:', error);
            throw new Error(`Failed to sign comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        const signedComment = {
            ...comment,
            signature,
            nonce
        };

        return new Promise((resolve, reject) => {
            targetNode.get(annotationId).get('comments').get(comment.id).put(signedComment, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to save comment:', ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Saved comment:', signedComment);
                    resolve();
                }
            });
        });
    }

    async deleteAnnotation(url: string, id: string, did: string, keyPair: { pub: string; priv: string }): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);
        const key = `${domainShard}/${url}/${id}`;

        const sea = this.gun.SEA || SEA;
        if (!sea) {
            console.error('AnnotationManager: No SEA module available');
            throw new Error('SEA module not loaded');
        }

        const timestamp = Date.now();
        const nonce = this.generateNonce();
        const dataToSign = {
            key,
            timestamp,
            nonce
        };

        let signature: string;
        try {
            console.log('AnnotationManager: Attempting to sign deletion for key:', key);
            signature = await sea.sign(JSON.stringify(dataToSign), keyPair);
            if (!signature) {
                console.error('AnnotationManager: Deletion signature generation returned empty result');
                throw new Error('Deletion signature generation returned empty result');
            }
            console.log('AnnotationManager: Successfully generated deletion signature:', signature.slice(0, 10) + '...');
        } catch (error) {
            console.error('AnnotationManager: Failed to sign deletion:', error);
            throw new Error(`Failed to sign deletion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        await new Promise<void>((resolve, reject) => {
            this.gun.get('deletions').get(key).put({
                author: did,
                signature,
                timestamp,
                nonce
            }, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to store deletion signature for key:', key, ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Stored deletion signature for key:', key);
                    targetNode.get(id).put({ isDeleted: true }, (ack: any) => {
                        if (ack.err) {
                            console.error('AnnotationManager: Failed to mark annotation as deleted:', ack.err);
                            reject(new Error(ack.err));
                        } else {
                            console.log('AnnotationManager: Successfully marked annotation as deleted for key:', key);
                            resolve();
                        }
                    });
                }
            });
        });
    }

    async deleteComment(url: string, annotationId: string, commentId: string, did: string, keyPair: { pub: string; priv: string }): Promise<void> {
        const { domainShard, subShard } = this.getShardKey(url);
        const targetNode = subShard ? this.gun.get(subShard).get(url) : this.gun.get(domainShard).get(url);
        const key = `${domainShard}/${url}/${annotationId}/comments/${commentId}`;

        const sea = this.gun.SEA || SEA;
        if (!sea) {
            console.error('AnnotationManager: No SEA module available');
            throw new Error('SEA module not loaded');
        }

        const timestamp = Date.now();
        const nonce = this.generateNonce();
        const dataToSign = {
            key,
            timestamp,
            nonce
        };

        let signature: string;
        try {
            console.log('AnnotationManager: Attempting to sign comment deletion for key:', key);
            signature = await sea.sign(JSON.stringify(dataToSign), keyPair);
            if (!signature) {
                console.error('AnnotationManager: Comment deletion signature generation returned empty result');
                throw new Error('Comment deletion signature generation returned empty result');
            }
            console.log('AnnotationManager: Successfully generated comment deletion signature:', signature.slice(0, 10) + '...');
        } catch (error) {
            console.error('AnnotationManager: Failed to sign comment deletion:', error);
            throw new Error(`Failed to sign comment deletion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        await new Promise<void>((resolve, reject) => {
            this.gun.get('deletions').get(key).put({
                author: did,
                signature,
                timestamp,
                nonce
            }, (ack: any) => {
                if (ack.err) {
                    console.error('AnnotationManager: Failed to store comment deletion signature for key:', key, ack.err);
                    reject(new Error(ack.err));
                } else {
                    console.log('AnnotationManager: Stored comment deletion signature for key:', key);
                    targetNode.get(annotationId).get('comments').get(commentId).put({ isDeleted: true }, (ack: any) => {
                        if (ack.err) {
                            console.error('AnnotationManager: Failed to mark comment as deleted:', ack.err);
                            reject(new Error(ack.err));
                        } else {
                            console.log('AnnotationManager: Successfully marked comment as deleted for key:', key);
                            resolve();
                        }
                    });
                }
            });
        });
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
                                        annotationId: comment.annotationId || annotation.id,
                                        signature: comment.signature,
                                        nonce: comment.nonce
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
                            signature: annotation.signature || '',
                            nonce: annotation.nonce,
                            metadata: annotation.metadata
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
                if (
                    !key ||
                    typeof key !== 'string' ||
                    key.includes('Marker') ||
                    !annotation ||
                    !annotation.id ||
                    typeof annotation.id !== 'string' ||
                    !annotation.author ||
                    typeof annotation.author !== 'string' ||
                    !annotation.author.startsWith('did:') ||
                    !annotation.content ||
                    typeof annotation.content !== 'string'
                ) {
                    console.warn(`[${timestamp}] Skipping invalid update or marker for URL: ${url}, Key: ${key}`, { annotation });
                    return;
                }
                if (lastProcessed.has(key) && now - lastProcessed.get(key)! < debounceInterval) {
                    console.log(`[${timestamp}] Skipping duplicate update for URL: ${url}, Key: ${key}`);
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
                                    annotationId: comment.annotationId || '',
                                    signature: comment.signature,
                                    nonce: comment.nonce
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
                            signature: annotation.signature || '',
                            nonce: annotation.nonce,
                            metadata: annotation.metadata
                        });
                        annotations.splice(0, annotations.length, ...updatedAnnotations);
                    }
                }

                entry.callbacks.forEach(cb => cb([...annotations]));
            };

            annotationNodes.forEach(node => node.map().on(onUpdate, { change: true, filter: { isDeleted: false } }));
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
}