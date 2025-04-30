// src/components/AnnotationList.tsx
import React, { useState } from 'react';
import { Annotation, Profile } from '../types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
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

    const handleCommentChange = (annotationId: string, value: string) => {
        setCommentInputs((prev) => ({ ...prev, [annotationId]: value }));
    };

    const handleSaveComment = async (annotationId: string) => {
        const content = commentInputs[annotationId] || '';
        if (content.trim() && onSaveComment) {
            console.log('AnnotationList: Saving comment for annotation:', annotationId, content);
            await onSaveComment(annotationId, content);
            setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
        }
    };

    const handleShare = async (annotation: Annotation) => {
        const normalizedUrl = normalizeUrl(annotation.url);
        const shareUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
        const shareText = `Check out this annotation: "${annotation.content.substring(0, 100)}..." by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;

        // Detect macOS
        const isMacOS = navigator.platform.toLowerCase().includes('mac');

        if (navigator.share && !isMacOS) {
            // Use native share sheet on non-macOS platforms
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
            // Show custom share modal on macOS or if share fails
            setShowShareModal(`${shareText} ${shareUrl}`);
        }
    };

    const handleCopyLink = async (shareContent: string) => {
        await navigator.clipboard.writeText(shareContent);
        alert('Link copied to clipboard!');
        setShowShareModal(null);
    };

    const generateShareLink = (platform: string, shareText: string, shareUrl: string) => {
        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(shareUrl);
        switch (platform) {
            case 'x':
                return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
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
                        <p className="annotation-content">{annotation.content || 'No content'}</p>
                        {annotation.comments && annotation.comments.length > 0 && (
                            <div className="comments-section">
                                {annotation.comments.map((comment) => {
                                    const commentAuthor = profiles[comment.author] || null;
                                    const commentAuthorHandle = commentAuthor ? commentAuthor.handle : 'Unknown';
                                    return (
                                        <div key={comment.id} className="comment-item">
                                            <span className="comment-author">{commentAuthorHandle}</span>
                                            <span className="comment-timestamp">
                        {' '}
                                                • {new Date(comment.timestamp).toLocaleString()}
                      </span>
                                            <p className="comment-content">{comment.content}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {onSaveComment && (
                            <div className="add-comment-section">
                <textarea
                    value={commentInputs[annotation.id] || ''}
                    onChange={(e) => handleCommentChange(annotation.id, e.target.value)}
                    placeholder="Add a comment..."
                    className="comment-textarea"
                />
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
                                className="share-button-social"
                            >
                                Share on X
                            </a>
                            <a
                                href={generateShareLink('facebook', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social"
                            >
                                Share on Facebook
                            </a>
                            <a
                                href={generateShareLink('whatsapp', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social"
                            >
                                Share on WhatsApp
                            </a>
                            <a
                                href={generateShareLink('telegram', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social"
                            >
                                Share on Telegram
                            </a>
                            <a
                                href={generateShareLink('email', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-button-social"
                            >
                                Share via Email
                            </a>
                            <button
                                onClick={() => handleCopyLink(showShareModal)}
                                className="share-button-social"
                            >
                                Copy Link
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