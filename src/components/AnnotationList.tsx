import React, { useState, useEffect, useRef, memo } from 'react';
import { Annotation, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { shortenUrl } from '../utils/shortenUrl';
import { stripHtml } from '../utils/stripHtml';
import Quill from 'quill';
import { ShareModal } from './ShareModal';
import { CommentList } from './CommentList';
import './AnnotationList.css';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    onDelete: (id: string) => Promise<void>;
    onDeleteComment?: (annotationId: string, commentId: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
    currentUrl: string;
    onShowToast: (message: string) => void;
}

const MemoizedCommentList = memo(CommentList);

export const AnnotationList: React.FC<AnnotationListProps> = ({
                                                                  annotations,
                                                                  profiles,
                                                                  onDelete,
                                                                  onDeleteComment,
                                                                  onSaveComment,
                                                                  currentUrl,
                                                                  onShowToast,
                                                              }) => {
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const [shareLoading, setShareLoading] = useState<boolean>(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const editorRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const quillInstances = useRef<Record<string, Quill | null>>({});
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

    console.log('AnnotationList: Received onDeleteComment prop:', onDeleteComment);

    // Initialize expandedComments state for all annotations
    useEffect(() => {
        const newExpandedState = annotations.reduce((acc, annotation) => {
            if (annotation.id && expandedComments[annotation.id] === undefined) {
                acc[annotation.id] = false;
            }
            return acc;
        }, {} as Record<string, boolean>);

        setExpandedComments((prev) => ({
            ...prev,
            ...newExpandedState,
        }));
    }, [annotations]);

    // Initialize Quill editors synchronously
    useEffect(() => {
        annotations.forEach((annotation) => {
            if (!annotation.id || !annotation.author || !annotation.content) {
                console.warn('Skipping Quill initialization for invalid annotation:', annotation);
                return;
            }

            const editorId = annotation.id;
            const editorElement = editorRefs.current[editorId];
            if (editorElement && !quillInstances.current[editorId]) {
                console.log(`Initializing Quill editor for annotation ${editorId}`);
                const wrapper = document.createElement('div');
                wrapper.className = 'quill-wrapper';
                editorElement.appendChild(wrapper);

                try {
                    quillInstances.current[editorId] = new Quill(wrapper, {
                        theme: 'snow',
                        modules: {
                            toolbar: [
                                ['bold', 'italic', 'underline'],
                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                ['link'],
                            ],
                        },
                        placeholder: 'Add a comment...',
                    });

                    quillInstances.current[editorId]!.on('text-change', () => {
                        const content = quillInstances.current[editorId]!.root.innerHTML || '';
                        setCommentInputs((prev) => ({
                            ...prev,
                            [editorId]: content === '<p><br></p>' ? '' : content,
                        }));
                    });
                } catch (error) {
                    console.error(`Failed to initialize Quill editor for annotation ${editorId}:`, error);
                }
            } else if (!editorElement) {
                console.warn(`Editor element not found for annotation ${editorId}`);
            }
        });

        // Clean up editors for removed annotations
        const currentAnnotationIds = new Set(annotations.map((annotation) => annotation.id).filter(Boolean));
        Object.keys(quillInstances.current).forEach((editorId) => {
            if (!currentAnnotationIds.has(editorId) && quillInstances.current[editorId]) {
                console.log(`Cleaning up Quill editor for removed annotation ${editorId}`);
                const editorElement = editorRefs.current[editorId];
                if (editorElement) {
                    editorElement.innerHTML = '';
                }
                quillInstances.current[editorId]!.off('text-change');
                quillInstances.current[editorId] = null;
                delete quillInstances.current[editorId];
                delete editorRefs.current[editorId];
            }
        });

        return () => {
            Object.keys(quillInstances.current).forEach((editorId) => {
                console.log(`Cleaning up Quill editor on unmount for annotation ${editorId}`);
                const editorElement = editorRefs.current[editorId];
                if (editorElement) {
                    editorElement.innerHTML = '';
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
            const urlToNormalize = annotation.url || currentUrl;
            if (!urlToNormalize) {
                throw new Error('No URL available for sharing');
            }
            const normalizedUrl = normalizeUrl(urlToNormalize);
            const longUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
            const shortUrl = await shortenUrl(longUrl);
            const plainContent = stripHtml(annotation.content);
            const truncatedContent =
                plainContent.trim()
                    ? plainContent.length > 100
                        ? plainContent.substring(0, 100) + '...'
                        : plainContent
                    : 'No content available';
            const shareText = `Check out this annotation: "${truncatedContent}" by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;
            setShowShareModal(`${shareText} ${shortUrl}`);
        } catch (err) {
            console.error('AnnotationList: Failed to shorten URL:', err);
            setShareError('Failed to shorten URL');
            const urlToNormalize = annotation.url || currentUrl;
            let longUrl: string;
            if (urlToNormalize) {
                const normalizedUrl = normalizeUrl(urlToNormalize);
                longUrl = `https://citizenx.app/check-extension?annotationId=${annotation.id}&url=${encodeURIComponent(normalizedUrl)}`;
            } else {
                longUrl = 'https://citizenx.app';
            }
            const plainContent = stripHtml(annotation.content);
            const truncatedContent =
                plainContent.trim()
                    ? plainContent.length > 100
                        ? plainContent.substring(0, 100) + '...'
                        : plainContent
                    : 'No content available';
            const shareText = `Check out this annotation: "${truncatedContent}" by ${profiles[annotation.author]?.handle || 'Unknown'} #CitizenX`;
            setShowShareModal(`${shareText} ${longUrl}`);
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyLink = async (shareContent: string) => {
        console.log('AnnotationList: Copying share content:', shareContent);
        await navigator.clipboard.writeText(shareContent);
        onShowToast('Link copied to clipboard!');
        console.log('AnnotationList: Triggered toast with message: Link copied to clipboard!');
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
                // Skip rendering invalid annotations
                if (!annotation.id || !annotation.author || !annotation.content) {
                    console.warn('Skipping rendering of invalid annotation:', annotation);
                    return null;
                }

                const authorProfile = profiles[annotation.author] || null;
                const authorHandle = authorProfile ? authorProfile.handle : 'Loading author...';
                console.log('AnnotationList: Rendering annotation:', annotation, 'Author handle:', authorHandle);

                // Filter out deleted comments and sort the rest by timestamp
                const sortedComments = annotation.comments
                    ? [...annotation.comments]
                        .filter((comment) => !comment.isDeleted && comment.author)
                        .sort((a, b) => a.timestamp - b.timestamp)
                    : [];
                const isExpanded = expandedComments[annotation.id] || false;

                return (
                    <div key={annotation.id} className="annotation-item" data-annotation-id={annotation.id}>
                        <div className="annotation-header">
                            <span className="annotation-author">{authorHandle}</span>
                            <span className="annotation-timestamp">
                                {' '}
                                • {new Date(annotation.timestamp).toLocaleString()}
                            </span>
                            <button
                                onClick={() => onDelete(annotation.id)}
                                className="delete-button"
                                title="Delete Annotation"
                            >
                                <svg
                                    className="delete-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                            <button
                                onClick={() => handleShare(annotation)}
                                className="share-button"
                                disabled={shareLoading}
                                title="Share"
                            >
                                {shareLoading ? (
                                    'Shortening...'
                                ) : (
                                    <svg
                                        className="share-icon"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                        <polyline points="16 6 12 2 8 6"></polyline>
                                        <line x1="12" y1="2" x2="12" y2="15"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div
                            className="annotation-content"
                            dangerouslySetInnerHTML={{ __html: annotation.content || 'No content' }}
                        />
                        <MemoizedCommentList
                            annotation={annotation}
                            profiles={profiles}
                            isExpanded={isExpanded}
                            onToggleComments={() => toggleComments(annotation.id)}
                            onSaveComment={onSaveComment}
                            onDeleteComment={onDeleteComment}
                            commentInput={commentInputs[annotation.id] || ''}
                            editorRef={(el) => (editorRefs.current[annotation.id] = el)}
                            handleSaveComment={() => handleSaveComment(annotation.id)}
                            onShowToast={onShowToast}
                        />
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
        </div>
    );
};