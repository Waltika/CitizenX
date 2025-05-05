import Gun from 'gun';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ReactDOMServer from 'react-dom/server';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import {
    AnnotationList,
    normalizeUrl,
    getAnnotationsServer,
    authenticateServer,
    saveProfileServer,
    exportIdentityServer,
    importIdentityServer,
    AnnotationType,
    ProfileType,
    CommentType
} from '@citizenx/shared';
import React, { FC } from 'react';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Express Request to include user and cookies
interface AuthenticatedRequest extends Request {
    user?: { did: string };
    cookies: { [key: string]: string };
}

const port = process.env.PORT || 8765;
const publicUrl = 'https://citizen-x-bootsrap.onrender.com';
const initialPeers: string[] = [];
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
app.use(cors({
    origin: 'https://citizenx.app',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

const server = http.createServer(app).listen(port);

const dataDir = '/var/data/gun-data';
try {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created data directory:', dataDir);
    }
} catch (error) {
    console.error('Failed to create data directory:', dataDir, error);
}

const gun = Gun({
    web: server,
    peers: initialPeers,
    file: dataDir,
    radisk: true,
});

const peerId = `${publicUrl}-${Date.now()}`;
gun.get('knownPeers').get(peerId).put({ url: `${publicUrl}/gun`, timestamp: Date.now() }, (ack: any) => {
    if (ack.err) {
        console.error('Failed to register server in knownPeers:', ack.err);
    }
});

setInterval(() => {
    gun.get('knownPeers').get(peerId).put({ url: `${publicUrl}/gun`, timestamp: Date.now() }, (ack: any) => {
        if (ack.err) {
            console.error('Failed to update server timestamp in knownPeers:', ack.err);
        }
    });
}, 5 * 60 * 1000);

setInterval(() => {
    gun.get('knownPeers').map().once((peer: { url: string; timestamp: number }, id: string) => {
        if (peer && peer.url && peer.timestamp) {
            const now = Date.now();
            const age = now - peer.timestamp;
            if (age > 10 * 60 * 1000) {
                gun.get('knownPeers').get(id).put(null);
            }
        }
    });
}, 5 * 60 * 1000);

// In-memory cache for profiles and user data
const profileCache = new Map<string, ProfileType>();
const userDataCache = new Map<string, { did: string; privateKey: string; profile?: ProfileType | null }>();

// Middleware to verify JWT
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Authentication endpoint
app.post('/api/authenticate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { did, passphrase } = req.body as { did?: string; passphrase: string };
    if (!passphrase) return res.status(400).json({ error: 'Missing passphrase' });

    try {
        const { did: authDid, privateKey } = await authenticateServer({ gun, did });
        const userData: { did: string; privateKey: string; profile?: ProfileType | null } = { did: authDid, privateKey };

        let profile: ProfileType | null = profileCache.get(authDid) || null;
        if (!profile) {
            profile = await new Promise<ProfileType | null>((resolve) => {
                gun.get('profiles').get(authDid).once((data: any) => {
                    if (data && data.handle) {
                        resolve({ did: authDid, handle: data.handle, profilePicture: data.profilePicture });
                    } else {
                        resolve(null);
                    }
                });
            });
        }

        if (profile) {
            profileCache.set(authDid, profile);
            userData.profile = profile;
        }

        userDataCache.set(authDid, userData);

        const token = jwt.sign({ did: authDid }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, secure: true });
        res.json({ token, did: authDid, profile });
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed: ' + (error as Error).message });
    }
});

// Add annotation endpoint
app.post('/api/annotations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { content, url } = req.body as { content: string; url: string };
    const author = req.user!.did;

    if (!content || !url) return res.status(400).json({ error: 'Missing content or URL' });

    try {
        const normalizedUrl = normalizeUrl(url);
        const timestamp = Date.now();
        const annotationId = `${author}-${timestamp}`;
        const annotation: AnnotationType = {
            id: annotationId,
            url: normalizedUrl,
            content,
            author,
            timestamp,
            comments: [],
        };

        gun.get('annotations').get(normalizedUrl).get(annotationId).put(annotation, (ack: any) => {
            if (ack.err) {
                res.status(500).json({ error: 'Failed to save annotation' });
            } else {
                res.json({ success: true, annotation });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete annotation endpoint
app.delete('/api/annotations/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { url } = req.query as { url: string };
    const author = req.user!.did;

    if (!url || !id) return res.status(400).json({ error: 'Missing URL or annotation ID' });

    try {
        const normalizedUrl = normalizeUrl(url);
        const annotation = await new Promise<AnnotationType | null>((resolve) => {
            gun.get('annotations').get(normalizedUrl).get(id).once((data: any) => {
                if (data) {
                    resolve({
                        id: data.id,
                        url: data.url,
                        content: data.content,
                        author: data.author,
                        timestamp: data.timestamp,
                        comments: [],
                    });
                } else {
                    resolve(null);
                }
            });
        });

        if (!annotation) return res.status(404).json({ error: 'Annotation not found' });
        if (annotation.author !== author) return res.status(403).json({ error: 'Unauthorized' });

        gun.get('annotations').get(normalizedUrl).get(id).put(null, (ack: any) => {
            if (ack.err) {
                res.status(500).json({ error: 'Failed to delete annotation' });
            } else {
                res.json({ success: true });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add comment endpoint
app.post('/api/comments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { annotationId, content, url } = req.body as { annotationId: string; content: string; url: string };
    const author = req.user!.did;

    if (!annotationId || !content || !url) return res.status(400).json({ error: 'Missing annotationId, content, or URL' });

    try {
        const normalizedUrl = normalizeUrl(url);
        const timestamp = Date.now();
        const commentId = `${author}-${timestamp}`;
        const comment: CommentType = {
            id: commentId,
            content,
            author,
            timestamp,
            authorHandle: profileCache.get(author)?.handle,
        };

        gun.get('annotations').get(normalizedUrl).get(annotationId).get('comments').get(commentId).put(comment, (ack: any) => {
            if (ack.err) {
                res.status(500).json({ error: 'Failed to save comment' });
            } else {
                res.json({ success: true, comment });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create or update profile endpoint
app.post('/api/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { handle, profilePicture } = req.body as { handle: string; profilePicture?: string };
    const did = req.user!.did;

    if (!handle) return res.status(400).json({ error: 'Missing handle' });

    try {
        await saveProfileServer({ gun, did, handle, profilePicture });
        const profile: ProfileType = { did, handle, profilePicture };
        profileCache.set(did, profile);
        const userData = userDataCache.get(did);
        if (userData) userData.profile = profile;
        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save profile: ' + (error as Error).message });
    }
});

// Export identity endpoint
app.post('/api/export-identity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { passphrase } = req.body as { passphrase: string };
    const did = req.user!.did;

    if (!passphrase) return res.status(400).json({ error: 'Missing passphrase' });

    try {
        const userData = userDataCache.get(did);
        if (!userData) throw new Error('User data not found');

        const exportedData = await exportIdentityServer({
            did,
            privateKey: userData.privateKey,
            profile: userData.profile || null,
            passphrase,
        });
        res.json({ success: true, data: exportedData });
    } catch (error) {
        res.status(500).json({ error: 'Failed to export identity: ' + (error as Error).message });
    }
});

// Import identity endpoint
app.post('/api/import-identity', async (req: Request, res: Response) => {
    const { data, passphrase } = req.body as { data: string; passphrase: string };

    if (!data || !passphrase) return res.status(400).json({ error: 'Missing data or passphrase' });

    try {
        const { did, privateKey, profile } = await importIdentityServer({ data, passphrase });
        const userData = { did, privateKey, profile: profile || null };
        userDataCache.set(did, userData);
        profileCache.set(did, profile || { did, handle: 'Unknown' });

        if (profile && profile.handle) {
            await saveProfileServer({ gun, did, handle: profile.handle, profilePicture: profile.profilePicture });
        }

        const token = jwt.sign({ did }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, secure: true });
        res.json({ success: true, token, did, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to import identity: ' + (error as Error).message });
    }
});

// Sign out endpoint
app.post('/api/sign-out', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const did = req.user!.did;
        userDataCache.delete(did);
        profileCache.delete(did);
        res.clearCookie('token');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to sign out: ' + (error as Error).message });
    }
});

// SSR endpoint for rendering annotations
app.get('/view-annotations', async (req: Request, res: Response) => {
    const url = req.query.url as string;
    const annotationId = req.query.annotationId as string;

    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const annotations = await getAnnotationsServer({ gun, url, normalizeUrl });
        const filteredAnnotations = annotationId
            ? annotations.filter((ann) => ann.id === annotationId)
            : annotations;

        if (!filteredAnnotations.length) {
            return res.status(404).send('No annotations found for this URL');
        }

        const profiles: Record<string, ProfileType> = filteredAnnotations.reduce((acc: Record<string, ProfileType>, ann) => {
            acc[ann.author] = { did: ann.author, handle: ann.authorHandle || 'Unknown', profilePicture: ann.authorProfilePicture };
            return acc;
        }, {});

        const renderedAnnotations = ReactDOMServer.renderToString(
            <AnnotationList
                annotations={filteredAnnotations}
                profiles={profiles}
                onDelete={async () => {}} // No-op for SSR
                onSaveComment={undefined} // Handled via API
            />
        );

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Annotations for ${url}</title>
                <link rel="stylesheet" href="/static/assets/AnnotationList.css">
                <script src="/static/client.js"></script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f7fa;
                        margin: 0;
                        padding: 1rem;
                    }
                    .annotations-container {
                        background-color: #fff;
                        padding: 1rem;
                        border-radius: 5px;
                        border: 1px solid #e5e7eb;
                    }
                    .page-link {
                        margin-top: 1rem;
                        display: block;
                        color: #2c7a7b;
                        text-decoration: none;
                    }
                    .page-link:hover {
                        color: #4a999a;
                    }
                </style>
            </head>
            <body>
                <div class="annotations-container">
                    ${renderedAnnotations}
                </div>
                <a class="page-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Open annotated page in a new tab">
                    View annotated page
                </a>
                <script>
                    window.__INITIAL_DATA__ = ${JSON.stringify({ annotations: filteredAnnotations, profiles })};
                    document.querySelectorAll('.comments-toggle-button').forEach(button => {
                        button.addEventListener('click', () => {
                            const annotationId = button.getAttribute('data-annotation-id');
                            const commentsSection = button.nextElementSibling;
                            const isExpanded = commentsSection.style.display === 'block';
                            if (isExpanded) {
                                commentsSection.style.display = 'none';
                                button.innerHTML = '+ Show ' + button.getAttribute('data-comment-count') + ' comment' + (parseInt(button.getAttribute('data-comment-count')) > 1 ? 's' : '');
                            } else {
                                commentsSection.style.display = 'block';
                                button.innerHTML = '− Hide comments';
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `;

        res.send(html);
    } catch (error) {
        console.error('Error rendering annotations:', error);
        res.status(500).send('Internal server error');
    }
});

console.log(`Gun server running on port ${port}`);