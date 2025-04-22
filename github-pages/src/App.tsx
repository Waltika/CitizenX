import React, { useState, useEffect } from 'react';
import { createOrbitDB } from '@orbitdb/core';
import { createHelia } from 'helia';
import { webSockets } from '@libp2p/websockets';
import { webRTC } from '@libp2p/webrtc';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import {FaultTolerance} from "@libp2p/interface";


const App: React.FC = () => {
    const [annotation, setAnnotation] = useState('');
    const [annotations, setAnnotations] = useState<{ _id: string; url: string; text: string; timestamp: number }[]>([]);
    const [db, setDb] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initOrbitDB() {
            try {
                console.log('Starting OrbitDB initialization for GitHub Pages');
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
                                    ],
                                }),
                            ],
                            services: {
                                identify: identify(),
                                pubsub: gossipsub(),
                            },
                        },
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
                const db = await orbitdb.open('citizenx-annotations', { type: 'documents' });
                console.log('Database opened:', db);
                await db.load();
                console.log('Database loaded');
                setDb(db);
                const docs = await db.all();
                setAnnotations(docs.map((doc: any) => doc.value));
                db.events.on('update', async () => {
                    const updatedDocs = await db.all();
                    setAnnotations(updatedDocs.map((doc: any) => doc.value));
                    console.log('GitHub Pages database updated:', updatedDocs);
                });
            } catch (error) {
                console.error('OrbitDB initialization failed:', error);
                setError('Failed to initialize decentralized storage');
            }
        }
        initOrbitDB();
    }, []);

    const handleSaveAnnotation = async () => {
        if (annotation.trim() && db) {
            try {
                const doc = {
                    _id: Date.now().toString(),
                    url: 'sidepanel',
                    text: annotation.trim(),
                    timestamp: Date.now(),
                };
                await db.put(doc);
                setAnnotation('');
                console.log('Saved annotation to OrbitDB:', doc);
            } catch (error) {
                console.error('Failed to save annotation:', error);
                setError('Failed to save annotation');
            }
        }
    };

    return (
        <div style={{ padding: '16px', maxWidth: '300px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                CitizenX Annotations
            </h1>
            {error && (
                <p style={{ color: 'red', margin: '0 0 8px 0' }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="Enter annotation..."
                    style={{
                        flex: 1,
                        padding: '5px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                    }}
                />
                <button
                    onClick={handleSaveAnnotation}
                    disabled={!db}
                    style={{
                        padding: '5px 10px',
                        background: db ? '#007bff' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: db ? 'pointer' : 'not-allowed',
                    }}
                >
                    Save
                </button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {annotations.length === 0 ? (
                    <p style={{ margin: 0, color: '#666' }}>No annotations yet.</p>
                ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {annotations.map((note) => (
                            <li
                                key={note._id}
                                style={{
                                    padding: '5px 0',
                                    borderBottom: '1px solid #eee',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {note.text} <small>({new Date(note.timestamp).toLocaleString()})</small>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default App;