import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { Annotation, Profile } from '@/types';
import { storage } from '../storage/StorageRepository';
import Quill from 'quill';
import DeleteIcon from '../assets/DeleteIcon.svg'; // Import the SVG as a React component
import './AnnotationList.css';

interface CommentListProps {
    annotation: Annotation;
    profiles: Record<string, Profile>;
    isExpanded: boolean;
    onToggleComments: () => void;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
    onDeleteComment?: (annotationId: string, commentId: string) => Promise<void>;
    commentInput: string;
    setCommentInput: (annotationId: string, content: string) => void;
    handleSaveComment: () => Promise<void>;
    onShowToast: (message: string) => void;
}

export interface CommentListRef {
    clearEditor: () => void;
}

export const CommentList = forwardRef<CommentListRef, CommentListProps>(({
                                                                             annotation,
                                                                             profiles,
                                                                             isExpanded,
                                                                             onToggleComments,
                                                                             onSaveComment,
                                                                             onDeleteComment,
                                                                             commentInput,
                                                                             setCommentInput,
                                                                             handleSaveComment,
                                                                             onShowToast,
                                                                         }, ref) => {
    const [currentDID, setCurrentDID] = useState<string | null>(null);
    const editorContainerRef = useRef<HTMLDivElement | null>(null);
    const quillInstance = useRef<Quill | null>(null);
    const isMounted = useRef<boolean>(false);

    useEffect(() => {
        const fetchDID = async () => {
            if (!isMounted.current) return;
            const did = await storage.getCurrentDID();
            setCurrentDID(did);
            console.log('CommentList: Fetched currentDID:', did);
        };
        fetchDID();

        return () => {
            console.log('CommentList: Cleaning up fetchDID effect');
        };
    }, []);

    useEffect(() => {
        isMounted.current = true;

        let wrapper: HTMLDivElement | null = null;
        if (editorContainerRef.current && !quillInstance.current) {
            console.log(`CommentList: Initializing Quill editor for annotation ${annotation.id}`);
            wrapper = document.createElement('div');
            wrapper.className = 'quill-wrapper';
            editorContainerRef.current.appendChild(wrapper);

            try {
                quillInstance.current = new Quill(wrapper, {
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

                if (commentInput && isMounted.current) {
                    quillInstance.current.root.innerHTML = commentInput;
                }

                quillInstance.current.on('text-change', () => {
                    if (!isMounted.current) return;
                    const content = quillInstance.current!.root.innerHTML || '';
                    setCommentInput(annotation.id, content === '<p><br></p>' ? '' : content);
                });
            } catch (error) {
                console.error(`CommentList: Failed to initialize Quill editor for annotation ${annotation.id}:`, error);
            }
        }

        return () => {
            console.log(`CommentList: Cleaning up Quill editor for annotation ${annotation.id}`);
            isMounted.current = false;
            if (editorContainerRef.current && wrapper) {
                editorContainerRef.current.removeChild(wrapper);
            }
            if (quillInstance.current) {
                quillInstance.current.off('text-change');
                quillInstance.current = null;
            }
        };
    }, [annotation.id, setCommentInput]);

    useImperativeHandle(ref, () => ({
        clearEditor: () => {
            if (quillInstance.current && isMounted.current) {
                console.log(`CommentList: Clearing Quill editor content for annotation ${annotation.id}`);
                quillInstance.current.setContents([]);
                setCommentInput(annotation.id, '');
            }
        },
    }), [annotation.id, setCommentInput]);

    const handleDeleteComment = async (commentId: string) => {
        console.log('CommentList: Delete button clicked for comment:', commentId);
        try {
            if (onDeleteComment) {
                await onDeleteComment(annotation.id, commentId);
                onShowToast('Comment deleted successfully');
            } else {
                console.error('CommentList: onDeleteComment prop is undefined');
            }
        } catch (error: any) {
            console.error('CommentList: Failed to delete comment:', error);
            onShowToast(error.message || 'Failed to delete comment');
        }
    };

    const sortedComments = annotation.comments
        ? [...annotation.comments].sort((a, b) => a.timestamp - b.timestamp)
        : [];

    return (
        <div className="comments-container">
            <button
                className="comments-toggle-button"
                onClick={onToggleComments}
            >
                {isExpanded ? '−' : '+'} {isExpanded ? 'Hide comments' : `Show ${sortedComments.length} comment${sortedComments.length > 1 ? 's' : ''}`}
            </button>
            {isExpanded && sortedComments.length > 0 && (
                <div className="comments-section">
                    {sortedComments.map((comment) => {
                        const commentAuthor = comment.author && profiles[comment.author] ? profiles[comment.author] : null;
                        const commentAuthorHandle = commentAuthor ? commentAuthor.handle : 'Loading author...';
                        const isOwnComment = currentDID && comment.author === currentDID;
                        console.log('CommentList: Comment ID:', comment.id, 'Author:', comment.author, 'Current DID:', currentDID, 'isOwnComment:', isOwnComment);

                        return (
                            <div key={comment.id} className="comment-item">
                                <div className="comment-group">
                                    <div className="comment-header">
                                        <span className="comment-author">{commentAuthorHandle}</span>
                                        <span className="comment-timestamp">
                                            {' '}
                                            • {new Date(comment.timestamp).toLocaleString()}
                                        </span>
                                        {isOwnComment && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="comment-delete-button"
                                                title="Delete Comment"
                                            >
                                                <DeleteIcon className="delete-icon" width="16" height="16" />
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className="comment-content"
                                        dangerouslySetInnerHTML={{ __html: comment.content as string }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="add-comment-section">
                <div
                    ref={editorContainerRef}
                    className="quill-editor"
                ></div>
                {onSaveComment && (
                    <button
                        onClick={handleSaveComment}
                        disabled={!commentInput?.trim()}
                        className="add-comment-button"
                    >
                        Add Comment
                    </button>
                )}
            </div>
        </div>
    );
});

export default memo(CommentList, (prevProps, nextProps) => {
    return (
        prevProps.annotation === nextProps.annotation &&
        prevProps.isExpanded === nextProps.isExpanded &&
        prevProps.profiles === nextProps.profiles &&
        prevProps.onToggleComments === nextProps.onToggleComments &&
        prevProps.onSaveComment === nextProps.onSaveComment &&
        prevProps.onDeleteComment === nextProps.onDeleteComment &&
        prevProps.commentInput === nextProps.commentInput &&
        prevProps.setCommentInput === nextProps.setCommentInput &&
        prevProps.handleSaveComment === nextProps.handleSaveComment &&
        prevProps.onShowToast === nextProps.onShowToast
    );
});