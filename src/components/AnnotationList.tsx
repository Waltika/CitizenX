import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Profile } from '../types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { shortenUrl } from '../utils/shortenUrl';
import { stripHtml } from '../utils/stripHtml';
import Quill from 'quill';
import { ShareModal } from './ShareModal';
import { Toast } from './Toast'; // Import the new Toast component
import './AnnotationList.css';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    onDelete: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
    currentUrl: string;
}

export const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, profiles, onDelete, onSaveComment, currentUrl }) => {
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState<boolean>(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);
    const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const quillInstances = useRef<Record<string, Quill | null>>({});
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

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

    // Separate useEffect for initializing Quill editors after refs are set
    useEffect(() => {
        const initializeQuillEditors = () => {
            annotations.forEach((annotation) => {
                const editorId = annotation.id;
                const editorElement = editorRefs.current[editorId];
                if (editorElement && !quillInstances.current[editorId]) {
                    console.log(`Initializing Quill editor for annotation ${editorId}`);
                    // Create a wrapper div to hold the Quill editor and toolbar
                    const wrapper = document.createElement('div');
                    wrapper.className = 'quill-wrapper';
                    editorElement.appendChild(wrapper);

                    try {
                        // Initialize Quill editor
                        quillInstances.current[editorId] = new Quill(wrapper, {
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
                    } catch (error) {
                        console.error(`Failed to initialize Quill editor for annotation ${editorId}:`, error);
                    }
                } else if (!editorElement) {
                    console.warn(`Editor element not found for annotation ${editorId}`);
                }
            });
        };

        // Delay initialization to ensure DOM is fully rendered
        const timer = setTimeout(initializeQuillEditors, 0);

        // Clean up Quill editors for removed annotations
        const currentAnnotationIds = new Set(annotations.map((annotation) => annotation.id));
        Object.keys(quillInstances.current).forEach((editorId) => {
            if (!currentAnnotationIds.has(editorId) && quillInstances.current[editorId]) {
                console.log(`Cleaning up Quill editor for removed annotation ${editorId}`);
                // Remove the Quill editor's DOM elements
                const editorElement = editorRefs.current[editorId];
                if (editorElement) {
                    editorElement.innerHTML = ''; // Clear the DOM
                }
                // Remove the text-change listener and nullify the instance
                quillInstances.current[editorId]!.off('text-change');
                quillInstances.current[editorId] = null;
                delete quillInstances.current[editorId];
                delete editorRefs.current[editorId];
            }
        });

        // Cleanup on unmount
        return () => {
            clearTimeout(timer);
            Object.keys(quillInstances.current).forEach((editorId) => {
                console.log(`Cleaning up Quill editor on unmount for annotation ${editorId}`);
                const editorElement = editorRefs.current[editorId];
                if (editorElement) {
                    editorElement.innerHTML = ''; // Clear the DOM
                }
                if (quillInstances.current[editorId]) {
                    quillInstances.current[editorId]!.off('text-change');
                    quillInstances.current[editorId] = null;
                }
            });
            quillInstances.current = {};
            editorRefs.current = {};
        };
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
        setShareLoading(true);
        setShareError(null);
        try {
            // Use annotation.url if defined, otherwise fall back to currentUrl
            const urlToNormalize = annotation.url || currentUrl;
            if (!urlToNormalize) {
                throw new Error('No URL available for sharing');
            }
            const normalizedUrl = normalizeUrl(urlToNormalize);
            const longUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
            const shortUrl = await shortenUrl(longUrl);
            const plainContent = stripHtml(annotation.content);
            const truncatedContent = plainContent.trim()
                ? (plainContent.length > 100 ? plainContent.substring(0, 100) + "..." : plainContent)
                : "No content available";
            const shareText = `Check out this annotation: "${truncatedContent}" by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;
            setShowShareModal(`${shareText} ${shortUrl}`);
        } catch (err) {
            console.error('AnnotationList: Failed to shorten URL:', err);
            setShareError('Failed to shorten URL');
            // Use annotation.url if defined, otherwise fall back to currentUrl
            const urlToNormalize = annotation.url || currentUrl;
            let longUrl = '';
            if (urlToNormalize) {
                const normalizedUrl = normalizeUrl(urlToNormalize);
                longUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
            } else {
                longUrl = 'https://citizenx.app'; // Fallback to a generic URL if no URL is available
            }
            const plainContent = stripHtml(annotation.content);
            const truncatedContent = plainContent.trim()
                ? (plainContent.length > 100 ? plainContent.substring(0, 100) + "..." : plainContent)
                : "No content available";
            const shareText = `Check out this annotation: "${truncatedContent}" by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;
            setShowShareModal(`${shareText} ${longUrl}`); // Fallback to long URL
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyLink = async (shareContent: string) => {
        await navigator.clipboard.writeText(shareContent);
        setToastMessage('Link copied to clipboard!');
        setShowToast(true);
        setShowShareModal(null);
    };

    const toggleComments = (annotationId: string) => {
        setExpandedComments((prev) => ({
            ...prev,
            [annotationId]: !prev[annotationId],
        }));
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
                            <button onClick={() => handleShare(annotation)} className="share-button" disabled={shareLoading}>
                                {shareLoading ? 'Shortening...' : 'Share'}
                            </button>
                        </div>
                        <div
                            className="annotation-content"
                            dangerouslySetInnerHTML={{ __html: annotation.content || 'No content' }}
                        />
                        <div className="comments-container">
                            <button
                                className="comments-toggle-button"
                                onClick={() => toggleComments(annotation.id)}
                            >
                                {isExpanded ? '−' : '+'} {isExpanded ? 'Hide comments' : `Show ${sortedComments.length} comment${sortedComments.length > 1 ? 's' : ''}`}
                            </button>
                            {isExpanded && sortedComments.length > 0 && (
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
                            <div className="add-comment-section">
                                <div
                                    ref={(el) => (editorRefs.current[annotation.id] = el)}
                                    className="quill-editor"
                                ></div>
                            </div>
                            {onSaveComment && (
                                <button
                                    onClick={() => handleSaveComment(annotation.id)}
                                    disabled={!commentInputs[annotation.id]?.trim()}
                                    className="add-comment-button"
                                >
                                    Add Comment
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {showShareModal && (
                <ShareModal
                    showShareModal={showShareModal}
                    shareError={shareError}
                    onClose={() => setShowShareModal(null)}
                    onCopyLink={handleCopyLink}
                />
            )}

            <Toast message={toastMessage} isVisible={showToast} />
        </div>
    );
};