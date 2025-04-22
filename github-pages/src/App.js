import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const App = () => {
    const [annotation, setAnnotation] = useState('');
    const [annotations, setAnnotations] = useState([]);
    const [db, setDb] = useState(null);
    const [error, setError] = useState(null);
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
                                        '/dns4/relay.libp2p.io/tcp/443/wss/p2p/12D3KooWAdNWhqW6zSMv1tW2aLKNvEfR7f2DubkXq56Y2uLmsdN',
                                    ],
                                }),
                            ],
                            services: {
                                identify: identify(),
                                pubsub: gossipsub(),
                            },
                        },
                    });
                    // Log connected peers for debugging
                    ipfs.libp2p.addEventListener('peer:connect', (event) => {
                        console.log('Connected to peer:', event.detail.toString());
                    });
                    ipfs.libp2p.addEventListener('peer:disconnect', (event) => {
                        console.log('Disconnected from peer:', event.detail.toString());
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
                const db = await orbitdb.open('citizenx-annotations', { type: 'documents' });
                console.log('Database opened:', db);
                setDb(db);
                const docs = await db.all();
                setAnnotations(docs.map((doc) => doc.value));
                db.events.on('update', async () => {
                    const updatedDocs = await db.all();
                    setAnnotations(updatedDocs.map((doc) => doc.value));
                    console.log('GitHub Pages database updated:', updatedDocs);
                });
            }
            catch (error) {
                console.error('OrbitDB initialization failed:', error);
                setError('Failed to initialize decentralized storage');
            }
        }
        initOrbitDB();
    }, []);
    const handleSaveAnnotation = async () => {
        if (annotation.trim() && db) {
            const doc = {
                _id: Date.now().toString(),
                url: 'sidepanel',
                text: annotation.trim(),
                timestamp: Date.now(),
            };
            try {
                await db.put(doc);
                setAnnotation('');
                console.log('Saved annotation to OrbitDB:', doc);
            }
            catch (error) {
                const err = error;
                if (err.message.includes('NoPeersSubscribedToTopic')) {
                    console.warn('No peers subscribed, saving to localStorage:', doc);
                    const localAnnotations = JSON.parse(localStorage.getItem('citizenx-annotations') || '[]');
                    localAnnotations.push(doc);
                    localStorage.setItem('citizenx-annotations', JSON.stringify(localAnnotations));
                    setAnnotation('');
                    setAnnotations(localAnnotations);
                    db.events.on('peer', async () => {
                        console.log('Peer connected, retrying save to OrbitDB');
                        try {
                            await db.put(doc);
                            console.log('Successfully saved to OrbitDB after peer connection:', doc);
                            localStorage.removeItem('citizenx-annotations');
                        }
                        catch (retryError) {
                            console.error('Retry failed:', retryError);
                        }
                    });
                }
                else {
                    console.error('Failed to save annotation:', err);
                    setError('Failed to save annotation');
                }
            }
        }
    };
    return (_jsxs("div", { style: { padding: '16px', maxWidth: '300px' }, children: [_jsx("h1", { style: { fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 8px 0' }, children: "CitizenX Annotations" }), error && (_jsx("p", { style: { color: 'red', margin: '0 0 8px 0' }, children: error })), _jsxs("div", { style: { display: 'flex', gap: '8px', marginBottom: '8px' }, children: [_jsx("input", { type: "text", value: annotation, onChange: (e) => setAnnotation(e.target.value), placeholder: "Enter annotation...", style: {
                            flex: 1,
                            padding: '5px',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                        } }), _jsx("button", { onClick: handleSaveAnnotation, disabled: !db, style: {
                            padding: '5px 10px',
                            background: db ? '#007bff' : '#ccc',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: db ? 'pointer' : 'not-allowed',
                        }, children: "Save" })] }), _jsx("div", { style: { maxHeight: '300px', overflowY: 'auto' }, children: annotations.length === 0 ? (_jsx("p", { style: { margin: 0, color: '#666' }, children: "No annotations yet." })) : (_jsx("ul", { style: { margin: 0, padding: 0, listStyle: 'none' }, children: annotations.map((note) => (_jsxs("li", { style: {
                            padding: '5px 0',
                            borderBottom: '1px solid #eee',
                            wordBreak: 'break-word',
                        }, children: [note.text, " ", _jsxs("small", { children: ["(", new Date(note.timestamp).toLocaleString(), ")"] })] }, note._id))) })) })] }));
};
export default App;
