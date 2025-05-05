import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Profile } from '../types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import Quill from 'quill';
import './AnnotationList.css';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    onDelete: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment }) => {
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const quillInstances = useRef<Record<string, Quill | null>>({});
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

    // Initialize Quill editors for each comment
    useEffect(() => {
        annotations.forEach((annotation) => {
            const editorId = annotation.id;
            const editorElement = editorRefs.current[editorId];
            if (editorElement && !quillInstances.current[editorId]) {
                quillInstances.current[editorId] = new Quill(editorElement, {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            ['link']
                        ]
                    },
                    placeholder: 'Add a comment...'
                });

                quillInstances.current[editorId]!.on('text-change', () => {
                    const content = quillInstances.current[editorId]!.root.innerHTML || '';
                    setCommentInputs((prev) => ({
                        ...prev,
                        [editorId]: content === '<p><br></p>' ? '' : content
                    }));
                });
            }
        });

        return () => {
            annotations.forEach((annotation) => {
                const editorId = annotation.id;
                if (quillInstances.current[editorId]) {
                    quillInstances.current[editorId]!.off('text-change');
                    quillInstances.current[editorId] = null;
                }
            });
        };
    }, [annotations]);

    // Initialize collapsed state for each annotation's comments
    useEffect(() => {
        const initialExpandedState: Record<string, boolean> = {};
        annotations.forEach((annotation) => {
            // Only initialize if not already set to preserve state across renders
            if (expandedComments[annotation.id] === undefined) {
                initialExpandedState[annotation.id] = false; // Collapsed by default
            }
        });
        setExpandedComments((prev) => ({
            ...prev,
            ...initialExpandedState,
        }));
    }, [annotations]);

    const handleSaveComment = async (annotationId: string) => {
        const content = commentInputs[annotationId] || '';
        if (content.trim() && onSaveComment) {
            console.log('AnnotationList: Saving comment for annotation:', annotationId, content);
            await onSaveComment(annotationId, content);
            setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
            const quill = quillInstances.current[annotationId];
            if (quill) {
                quill.setContents([]);
            }
        }
    };

    const handleShare = async (annotation: Annotation) => {
        const normalizedUrl = normalizeUrl(annotation.url);
        const shareUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
        const shareText = `Check out this annotation: "${annotation.content.substring(0, 100)}..." by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;

        const isMacOS = navigator.platform.toLowerCase().includes('mac');

        if (navigator.share && !isMacOS) {
            try {
                await navigator.share({
                    title: 'CitizenX Annotation',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                console.error('AnnotationList: Share failed:', err);
                setShowShareModal(`${shareText} ${shareUrl}`);
            }
        } else {
            setShowShareModal(`${shareText} ${shareUrl}`);
        }
    };

    const handleCopyLink = async (shareContent: string) => {
        await navigator.clipboard.writeText(shareContent);
        alert('Link copied to clipboard!');
        setShowShareModal(null);
    };

    const toggleComments = (annotationId: string) => {
        setExpandedComments((prev) => ({
            ...prev,
            [annotationId]: !prev[annotationId],
        }));
    };

    const generateShareLink = (platform: string, shareText: string, shareUrl: string) => {
        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(shareUrl);
        switch (platform) {
            case 'x':
                return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}"e=${encodedText}`;
            case 'whatsapp':
                return `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
            case 'telegram':
                return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
            case 'email':
                return `mailto:?subject=CitizenX%20Annotation&body=${encodedText}%20${encodedUrl}`;
            default:
                return '#';
        }
    };

    return (
        <div className="annotation-list">
            {annotations.map((annotation) => {
                const authorProfile = profiles[annotation.author] || null;
                const authorHandle = authorProfile ? authorProfile.handle : 'Unknown';
                console.log('AnnotationList: Rendering annotation:', annotation, 'Author handle:', authorHandle);

                // Sort comments by timestamp in ascending order (oldest to newest)
                const sortedComments = annotation.comments ? [...annotation.comments].sort((a, b) => a.timestamp - b.timestamp) : [];
                const isExpanded = expandedComments[annotation.id] || false;

                return (
                    <div key={annotation.id} className="annotation-item" data-annotation-id={annotation.id}>
                        <div className="annotation-header">
                            <span className="annotation-author">{authorHandle}</span>
                            <span className="annotation-timestamp">
                                {' '}
                                • {new Date(annotation.timestamp).toLocaleString()}
                            </span>
                            <button onClick={() => onDelete(annotation.id)} className="delete-button">
                                Delete
                            </button>
                            <button onClick={() => handleShare(annotation)} className="share-button">
                                Share
                            </button>
                        </div>
                        <div
                            className="annotation-content"
                            dangerouslySetInnerHTML={{ __html: annotation.content || 'No content' }}
                        />
                        {sortedComments.length > 0 && (
                            <>
                                <button
                                    className="comments-toggle-button"
                                    onClick={() => toggleComments(annotation.id)}
                                >
                                    {isExpanded ? '−' : '+'} {isExpanded ? 'Hide comments' : `Show ${sortedComments.length} comment${sortedComments.length > 1 ? 's' : ''}`}
                                </button>
                                {isExpanded && (
                                    <div className="comments-section">
                                        {sortedComments.map((comment) => {
                                            const commentAuthor = profiles[comment.author] || null;
                                            const commentAuthorHandle = commentAuthor ? commentAuthor.handle : 'Unknown';
                                            return (
                                                <div key={comment.id} className="comment-item">
                                                    <div className="comment-group">
                                                        <div className="comment-header">
                                                            <span className="comment-author">{commentAuthorHandle}</span>
                                                            <span className="comment-timestamp">
                                                                {' '}
                                                                • {new Date(comment.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className="comment-content"
                                                            dangerouslySetInnerHTML={{ __html: comment.content }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                        {onSaveComment && (
                            <div className="add-comment-section">
                                <div
                                    ref={(el) => (editorRefs.current[annotation.id] = el)}
                                    className="quill-editor"
                                ></div>
                                <button
                                    onClick={() => handleSaveComment(annotation.id)}
                                    disabled={!commentInputs[annotation.id]?.trim()}
                                    className="add-comment-button"
                                >
                                    Add Comment
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {showShareModal && (
                <div className="share-modal">
                    <div className="share-modal-content">
                        <h3>Share Annotation</h3>
                        <div className="share-buttons">
                            <a
                                href={generateShareLink('x', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social share-x"
                                title="Share on X"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span>X (Twitter)</span>
                            </a>
                            <a
                                href={generateShareLink('facebook', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social share-whatsapp"
                                title="Share on Facebook"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396v8.01Z"/>
                                </svg>
                                <span>Facebook</span>
                            </a>
                            <a
                                href={generateShareLink('whatsapp', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social share-whatsapp"
                                title="Share on WhatsApp"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span>WhatsApp</span>
                            </a>
                            <a
                                href={generateShareLink('telegram', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social share-telegram"
                                title="Share on Telegram"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                </svg>
                                <span>Telegram</span>
                            </a>
                            <a
                                href={generateShareLink('email', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social share-email"
                                title="Share via Email"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                                <span>Email</span>
                            </a>
                            <button
                                onClick={() => handleCopyLink(showShareModal)}
                                className="share-button-social share-copy"
                                title="Copy Message"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                <span>Copy Message</span>
                            </button>
                        </div>
                        <button onClick={() => setShowShareModal(null)} className="share-modal-close">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};