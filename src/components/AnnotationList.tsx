import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Annotation, Profile } from '@/types';
import { normalizeUrl } from '../shared/utils/normalizeUrl';
import { shortenUrl } from '../utils/shortenUrl';
import { stripHtml } from '../utils/stripHtml';
import { ShareModal } from './ShareModal';
import { CommentList, CommentListRef } from './CommentList';
import DeleteIcon from '../assets/DeleteIcon.svg'; // Import the SVG as a React component
import ShareIcon from '../assets/ShareIcon.svg'; // Import the SVG as a React component
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

const sanitizeAnnotationContent = (content: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const elements = tempDiv.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        elements[i].removeAttribute('style');
    }

    return tempDiv.innerHTML;
};

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
    const commentListRefs = useRef<Record<string, React.RefObject<CommentListRef>>>({});

    console.log('AnnotationList: Received onDeleteComment prop:', onDeleteComment);

    useEffect(() => {
        const newExpandedState = annotations.reduce((acc, annotation) => {
            if (annotation.id && expandedComments[annotation.id] === undefined) {
                acc[annotation.id] = false;
            }
            return acc;
        }, {} as Record<string, boolean>);

        annotations.forEach(annotation => {
            if (annotation.id && !commentListRefs.current[annotation.id]) {
                commentListRefs.current[annotation.id] = React.createRef<CommentListRef>();
            }
        });

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
                setCommentInputs((prev) => ({ ...prev, [annotationId]: '' }));
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
                if (!annotation.id || !annotation.author || !annotation.content) {
                    console.warn('AnnotationList: Skipping rendering of invalid annotation:', annotation);
                    return null;
                }

                const authorProfile = profiles[annotation.author] || null;
                const authorHandle = authorProfile ? authorProfile.handle : 'Loading author...';
                console.log('AnnotationList: Rendering annotation:', annotation, 'Author handle:', authorHandle);

                const sortedComments = annotation.comments
                    ? [...annotation.comments]
                        .filter((comment) => !comment.isDeleted && comment.author)
                        .sort((a, b) => a.timestamp - b.timestamp)
                    : [];
                const isExpanded = expandedComments[annotation.id] || false;

                const sanitizedContent = sanitizeAnnotationContent(annotation.content || 'No content');

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
                                <DeleteIcon className="delete-icon" width="16" height="16" />
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
                                    <ShareIcon className="share-icon" width="16" height="16" />
                                )}
                            </button>
                        </div>
                        <div
                            className="annotation-content"
                            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
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