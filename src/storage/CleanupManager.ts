// CleanupManager.ts
export class CleanupManager {
    private gun: any;

    constructor(gun: any) {
        this.gun = gun;
    }

    startCleanupJob(): void {
        setInterval(async () => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] CleanupManager: Running cleanup job for tombstones`);
            const annotationNodes = this.gun.get('annotations');
            annotationNodes.map().once(async (data: any, url: string) => {
                if (!url) return;
                const annotations = annotationNodes.get(url);
                annotations.map().once((annotation: any, id: string) => {
                    const logTimestamp = new Date().toISOString();
                    if (annotation === null) {
                        console.log(`[${logTimestamp}] CleanupManager: Found tombstone for URL: ${url}, ID: ${id}`);
                    } else if (annotation?.isDeleted) {
                        console.log(`[${logTimestamp}] CleanupManager: Found marked-for-deletion annotation for URL: ${url}, ID: ${id}, ensuring tombstone`);
                        annotations.get(id).put(null, (ack: any) => {
                            if (ack.err) {
                                console.error(`[${logTimestamp}] CleanupManager: Failed to tombstone marked-for-deletion annotation for URL: ${url}, ID: ${id}, Error:`, ack.err);
                            } else {
                                console.log(`[${logTimestamp}] CleanupManager: Successfully tombstoned marked-for-deletion annotation for URL: ${url}, ID: ${id}`);
                            }
                        });
                    }
                });
            });
        }, 60 * 60 * 1000); // Run every hour
    }

    async inspectAnnotations(): Promise<void> {
        console.log('CleanupManager: Inspecting all annotations...');
        const annotationNodes = this.gun.get('annotations');
        annotationNodes.map().once(async (data: any, url: string) => {
            if (!url) return;
            console.log(`Inspecting annotations for URL: ${url}`);
            const annotations = annotationNodes.get(url);
            annotations.map().once((annotation: any, id: string) => {
                const timestamp = new Date().toISOString();
                if (annotation === null) {
                    console.log(`[${timestamp}] CleanupManager: Found tombstone for URL: ${url}, ID: ${id}`);
                } else if (annotation?.isDeleted) {
                    console.log(`[${timestamp}] CleanupManager: Found marked-for-deletion annotation for URL: ${url}, ID: ${id}, Data:`, annotation);
                } else {
                    console.log(`[${timestamp}] CleanupManager: Found active annotation for URL: ${url}, ID: ${id}, Data:`, annotation);
                }
            });
        });
    }
}