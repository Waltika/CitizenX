// src/hooks/useOrbitDB.ts
import { useState, useEffect } from 'react';
import { createOrbitDB } from 'shared/src/types/orbitdb-core';
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { FaultTolerance } from '@libp2p/interface';
import { bootstrapNodes } from "../config/boostrap";
export const useOrbitDB = (url) => {
    const [db, setDb] = useState(null);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);
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
                                    list: bootstrapNodes,
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
                }
                catch (heliaError) {
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
                    setIsReady(true);
                });
                database.events.on('load.progress', (address, hash, entry, progress, total) => {
                    console.log('Database load progress:', { address, hash, progress, total });
                });
                database.events.on('replicated', () => {
                    console.log('Database replicated:', database);
                });
                // Set db immediately after opening
                console.log('Setting db immediately after open:', database);
                setDb(database);
                // Wait for the database to be ready
                const timeout = setTimeout(() => {
                    console.log('Database open timeout reached, assuming ready:', database);
                    setIsReady(true);
                }, 5000);
                database.events.on('ready', () => {
                    clearTimeout(timeout);
                });
            }
            catch (error) {
                console.error('OrbitDB initialization failed:', error);
                setError('Failed to initialize decentralized storage');
                setIsReady(true); // Allow fallback to localStorage even if initialization fails
            }
        }
        initOrbitDB();
        return () => {
            if (db) {
                db.close();
            }
        };
    }, [url]);
    return { db, error, isReady };
};
