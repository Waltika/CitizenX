import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Annotation {
    id: string;
    content: string;
    author: string;
    timestamp: string;
    comments: Comment[];
    pageCid: string;
}

interface Comment {
    id: string;
    content: string;
    author: string;
    timestamp: string;
}

interface UserProfile {
    handle: string;
    pictureCid: string;
}

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = process.env.PINATA_JWT;

const normalizeUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        for (const key of params.keys()) {
            if (key.startsWith('utm_')) params.delete(key);
        }
        urlObj.search = params.toString();
        urlObj.hash = '';
        const hostname = urlObj.hostname.replace(/^(en|fr|de)\./, '');
        return `${urlObj.protocol}//${hostname}${urlObj.pathname}${urlObj.search}`;
    } catch {
        return url;
    }
};

const App: React.FC = () => {
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [notifications, setNotifications] = useState<string[]>([]);
    const [currentUrl, setCurrentUrl] = useState<string>('');

    const connectWallet = async () => {
        if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []);
            setUserAddress(accounts[0]);
            await loadProfile(accounts[0]);
        }
    };

    const loadProfile = async (address: string) => {
        const profileKey = `profile_${address}`;
        const profileCid = localStorage.getItem(profileKey);
        if (profileCid) {
            try {
                const response = await fetch(`https://ipfs.io/ipfs/${profileCid}`);
                const profileData = await response.json();
                setProfile(profileData);
            } catch {
                console.error('Failed to fetch profile');
            }
        } else {
            const newProfile: UserProfile = { handle: `User_${address.slice(0, 6)}`, pictureCid: '' };
            const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(newProfile),
            });
            const { IpfsHash } = await response.json();
            localStorage.setItem(profileKey, IpfsHash);
            setProfile(newProfile);
        }
    };

    const loadAnnotations = async (url: string) => {
        const normalizedUrl = normalizeUrl(url);
        const pageData = { url: normalizedUrl, annotations: [] };
        let pageCid: string;
        try {
            const pageResponse = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(pageData),
            });
            pageCid = (await pageResponse.json()).IpfsHash;
        } catch {
            console.error('Failed to pin page');
            return;
        }
        try {
            const response = await fetch(`https://ipfs.io/ipfs/${pageCid}`);
            const data = await response.json();
            const annotationCids = data.annotations || [];
            const loadedAnnotations: Annotation[] = [];
            for (const cid of annotationCids) {
                const annotationResponse = await fetch(`https://ipfs.io/ipfs/${cid}`);
                const annotation = await annotationResponse.json();
                loadedAnnotations.push(annotation);
            }
            setAnnotations(loadedAnnotations);
            window.postMessage({ action: 'receiveAnnotations', url: normalizedUrl, annotations: loadedAnnotations }, '*');
        } catch {
            console.error('Failed to fetch annotations');
        }
    };

    const savePageHistory = async (url: string) => {
        const normalized = normalizeUrl(url);
        if (!history.includes(normalized)) {
            const newHistory = [...history, normalized];
            setHistory(newHistory);
            try {
                const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(newHistory),
                });
                const { IpfsHash } = await response.json();
                localStorage.setItem(`history_${userAddress}`, IpfsHash);
            } catch {
                console.error('Failed to save history');
            }
        }
    };

    const addAnnotation = async (annotation: Annotation) => {
        if (!userAddress || !currentUrl) return;
        const normalizedUrl = normalizeUrl(currentUrl);
        let pageCid: string;
        try {
            const pageResponse = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: normalizedUrl, annotations: [] }),
            });
            pageCid = (await pageResponse.json()).IpfsHash;
        } catch {
            console.error('Failed to pin page');
            return;
        }
        try {
            const annotationResponse = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...annotation, pageCid }),
            });
            const { IpfsHash } = await annotationResponse.json();
            const newAnnotations = [...annotations, { ...annotation, pageCid }];
            setAnnotations(newAnnotations);
            setNotifications((prev) => [...prev, `New annotation on ${normalizedUrl}`]);
            const pageUpdate = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: normalizedUrl, annotations: [...(annotations.map(a => a.id)), IpfsHash] }),
            });
            window.postMessage({ action: 'receiveAnnotations', url: normalizedUrl, annotations: newAnnotations }, '*');
        } catch {
            console.error('Failed to pin annotation');
        }
    };

    useEffect(() => {
        window.postMessage({ action: 'requestUrl' }, '*');
        window.addEventListener('message', (event) => {
            if (event.data.action === 'receiveUrl') {
                setCurrentUrl(event.data.url);
                loadAnnotations(event.data.url);
                savePageHistory(event.data.url);
            } else if (event.data.action === 'urlChanged') {
                setCurrentUrl(event.data.url);
                loadAnnotations(event.data.url);
                savePageHistory(event.data.url);
            } else if (event.data.action === 'requestAnnotations') {
                loadAnnotations(event.data.url);
            } else if (event.data.action === 'addAnnotation') {
                addAnnotation(event.data.annotation);
            }
        });
        connectWallet();
        return () => window.removeEventListener('message', () => {});
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-lg font-bold">CitizenX</h1>
            {userAddress ? (
                <>
                    <div className="mb-4">
                        <p>Welcome, {profile?.handle}</p>
                        {profile?.pictureCid && (
                            <img src={`https://ipfs.io/ipfs/${profile.pictureCid}`} alt="Profile" className="w-10 h-10 rounded-full" />
                        )}
                    </div>
                    <div className="mb-4">
            <textarea
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                placeholder="Add annotation..."
                className="w-full p-2 border"
            />
                        <button
                            onClick={() =>
                                addAnnotation({
                                    id: `${Date.now()}`,
                                    content: newAnnotation,
                                    author: userAddress,
                                    timestamp: new Date().toISOString(),
                                    comments: [],
                                    pageCid: '',
                                })
                            }
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Submit
                        </button>
                    </div>
                    <div>
                        <h2 className="text-md font-semibold">Annotations</h2>
                        {annotations.map((anno) => (
                            <div key={anno.id} className="mb-2 p-2 border">
                                <p>{anno.content}</p>
                                <p className="text-sm">By {anno.author} at {anno.timestamp}</p>
                                <div className="ml-4">
                                    {anno.comments.map((comment) => (
                                        <div key={comment.id} className="p-1">
                                            <p>{comment.content}</p>
                                            <p className="text-xs">By {comment.author} at {comment.timestamp}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h2 className="text-md font-semibold">Notifications</h2>
                        {notifications.map((note, i) => (
                            <p key={i} className="text-sm">{note}</p>
                        ))}
                    </div>
                </>
            ) : (
                <button onClick={connectWallet} className="px-4 py-2 bg-blue-500 text-white rounded">
                    Connect Wallet
                </button>
            )}
        </div>
    );
};

export default App;