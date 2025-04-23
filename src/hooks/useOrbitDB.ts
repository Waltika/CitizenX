// src/hooks/useOrbitDB.ts
import { useState, useEffect } from 'react';
import { createOrbitDB } from '@orbitdb/core';
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { FaultTolerance } from '@libp2p/interface';

interface UseOrbitDBResult {
    db: any;
    error: string | null;
}

export const useOrbitDB = (url: string): UseOrbitDBResult => {
    const [db, setDb] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initOrbitDB() {
            try {
                console.log('Starting OrbitDB initialization for', url);
                let ipfs;
                try {
                    ipfs = await createHelia({
                        libp2p: {
                            transports: [
                                webSockets(),
                                webRTC(),
                                circuitRelayTransport(),
                            ],
                            transportManager: {
                                faultTolerance: FaultTolerance.NO_FATAL,
                            },
                            peerDiscovery: [
                                bootstrap({
                                    list: [
                                        '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/12D3KooWQL1aS4qD3yCjmV7gNmx4F5gP7pNXG1qimV5DXe7tXUn',
                                        '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/12D3KooWAtfLqN4QmgjrZ9eZ9r4L1B7bH7d9eW8fA4n4bBAyKSm',
                                        '/dns4/relay.libp2p.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                        '/dns4/relay.ipfs.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                        '/dns4/relay.ipfs.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                    ],
                                }),
                            ],
                            services: {
                                identify: identify(),
                                pubsub: gossipsub(),
                            },
                        },
                    });
                    ipfs.libp2p.addEventListener('peer:connect', (event) => {
                        console.log('Connected to peer:', event.detail.toString());
                    });
                    ipfs.libp2p.addEventListener('peer:disconnect', (event) => {
                        console.log('Disconnected from peer:', event.detail.toString());
                    });
                    ipfs.libp2p.addEventListener('peer:discovery', (event) => {
                        console.log('Discovered peer:', event.detail.id.toString());
                    });
                } catch (heliaError) {
                    console.error('Failed to initialize Helia:', heliaError);
                    throw new Error('IPFS initialization failed');
                }
                console.log('IPFS initialized:', ipfs);
                if (!ipfs) {
                    throw new Error('IPFS instance is undefined');
                }
                const orbitdb = await createOrbitDB({ ipfs });
                console.log('OrbitDB instance created:', orbitdb);
                const database = await orbitdb.open('citizenx-annotations', { type: 'documents' });

                // Add event listeners to debug database status
                database.events.on('ready', () => {
                    console.log('Database ready:', database);
                });
                database.events.on('load.progress', (address, hash, entry, progress, total) => {
                    console.log('Database load progress:', { address, hash, progress, total });
                });
                database.events.on('replicated', () => {
                    console.log('Database replicated:', database);
                });

                // Set db immediately after opening, with a timeout to ensure readiness
                const timeout = setTimeout(() => {
                    console.log('Database open timeout reached, setting db:', database);
                    setDb(database);
                }, 5000); // 5-second timeout

                database.events.on('ready', () => {
                    clearTimeout(timeout);
                    console.log('Database opened:', database);
                    setDb(database);
                });
            } catch (error) {
                console.error('OrbitDB initialization failed:', error);
                setError('Failed to initialize decentralized storage');
            }
        }
        initOrbitDB();

        return () => {
            if (db) {
                db.close();
            }
        };
    }, [url]);

    return { db, error };
};