import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Annotation, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { shortenUrl } from '../utils/shortenUrl';
import { stripHtml } from '../utils/stripHtml';
import { ShareModal } from './ShareModal';
import { CommentList, CommentListRef } from './CommentList';
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
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    // Use refs to store CommentList instances
    const commentListRefs = useRef<Record<string, React.RefObject<CommentListRef>>>({});

    console.log('AnnotationList: Received onDeleteComment prop:', onDeleteComment);

    // Initialize expandedComments state and refs for all annotations
    useEffect(() => {
        const newExpandedState = annotations.reduce((acc, annotation) => {
            if (annotation.id && expandedComments[annotation.id] === undefined) {
                acc[annotation.id] = false;
            }
            return acc;
        }, {} as Record<string, boolean>);

        // Initialize refs for new annotations
        annotations.forEach(annotation => {
            if (annotation.id && !commentListRefs.current[annotation.id]) {
                commentListRefs.current[annotation.id] = React.createRef<CommentListRef>();
            }
        });

        // Clean up refs for removed annotations
        Object.keys(commentListRefs.current).forEach(annotationId => {
            if (!annotations.some(annotation => annotation.id === annotationId)) {
                delete commentListRefs.current[annotationId];
            }
        });

        setExpandedComments((prev) => ({
            ...prev,
            ...newExpandedState,
        }));
    }, [annotations]);

    const handleSetCommentInput = useCallback((annotationId: string, content: string) => {
        setCommentInputs((prev) => ({
            ...prev,
            [annotationId]: content,
        }));
    }, []);

    const handleSaveComment = useCallback(async (annotationId: string) => {
        const content = commentInputs[annotationId] || '';
        if (content.trim() && onSaveComment) {
            console.log('AnnotationList: Saving comment for annotation:', annotationId, content);
            try {
                await onSaveComment(annotationId, content);
                // Clear the comment input state
                setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
                // Clear the Quill editor using the ref
                const commentListRef = commentListRefs.current[annotationId];
                if (commentListRef.current) {
                    commentListRef.current.clearEditor();
                }
            } catch (error) {
                console.error('AnnotationList: Failed to save comment:', error);
                onShowToast('Failed to save comment');
            }
        }
    }, [commentInputs, onSaveComment, onShowToast]);

    const handleShare = useCallback(async (annotation: Annotation) => {
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
    }, [currentUrl, profiles]);

    const handleCopyLink = useCallback(async (shareContent: string) => {
        console.log('AnnotationList: Copying share content:', shareContent);
        await navigator.clipboard.writeText(shareContent);
        onShowToast('Link copied to clipboard!');
        console.log('AnnotationList: Triggered toast with message: Link copied to clipboard!');
        setShowShareModal(null);
    }, [onShowToast]);

    const toggleComments = useCallback((annotationId: string) => {
        setExpandedComments((prev) => ({
            ...prev,
            [annotationId]: !prev[annotationId],
        }));
    }, []);

    return (
        <div className="annotation-list">
            {annotations.map((annotation) => {
                // Skip rendering invalid annotations
                if (!annotation.id || !annotation.author || !annotation.content) {
                    console.warn('AnnotationList: Skipping rendering of invalid annotation:', annotation);
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
                            ref={commentListRefs.current[annotation.id]}
                            annotation={annotation}
                            profiles={profiles}
                            isExpanded={isExpanded}
                            onToggleComments={() => toggleComments(annotation.id)}
                            onSaveComment={onSaveComment}
                            onDeleteComment={onDeleteComment}
                            commentInput={commentInputs[annotation.id] || ''}
                            setCommentInput={handleSetCommentInput}
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