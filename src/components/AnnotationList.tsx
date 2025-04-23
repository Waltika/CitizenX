// src/components/AnnotationList.tsx
import React, { useState } from 'react';
import { Annotation, Comment } from '../shared/types/annotation';
import CommentComponent from './Comment';

interface AnnotationListProps {
    annotations: Annotation[];
    profiles: { [did: string]: { handle: string; profilePicture: string } };
    onSaveAnnotation: (content: string) => Promise<void>;
    onDeleteAnnotation: (id: string) => Promise<void>;
    onSaveComment: (annotationId: string, content: string) => Promise<void>;
}

const AnnotationList: React.FC<AnnotationListProps> = ({
                                                           annotations,
                                                           profiles,
                                                           onSaveAnnotation,
                                                           onDeleteAnnotation,
                                                           onSaveComment,
                                                       }) => {
    const [newAnnotationContent, setNewAnnotationContent] = useState('');
    const [newCommentContent, setNewCommentContent] = useState<{ [annotationId: string]: string }>({});

    const handleSubmitAnnotation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnnotationContent.trim()) return;
        try {
            await onSaveAnnotation(newAnnotationContent);
            setNewAnnotationContent('');
        } catch (err) {
            console.error('Failed to save annotation:', err);
        }
    };

    const handleSubmitComment = async (annotationId: string) => {
        const content = newCommentContent[annotationId]?.trim();
        if (!content) return;
        try {
            await onSaveComment(annotationId, content);
            setNewCommentContent((prev) => ({ ...prev, [annotationId]: '' }));
        } catch (err) {
            console.error('Failed to save comment:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await onDeleteAnnotation(id);
        } catch (err) {
            console.error('Failed to delete annotation:', err);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmitAnnotation}>
        <textarea
            value={newAnnotationContent}
            onChange={(e) => setNewAnnotationContent(e.target.value)}
            placeholder="Add a new annotation..."
        />
                <button type="submit">Save Annotation</button>
            </form>
            {annotations.map((annotation) => (
                <div key={annotation._id} className="annotation">
                    <p>
                        <strong>{profiles[annotation.did]?.handle || 'Unknown'}</strong> ({new Date(annotation.timestamp).toLocaleString()}):
                    </p>
                    <p>{annotation.text}</p>
                    <button onClick={() => handleDelete(annotation._id)}>Delete</button>
                    <div className="comments">
                        {annotation.comments?.map((comment) => (
                            <CommentComponent key={comment._id} comment={comment} profiles={profiles} />
                        ))}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmitComment(annotation._id);
                            }}
                        >
              <textarea
                  value={newCommentContent[annotation._id] || ''}
                  onChange={(e) =>
                      setNewCommentContent((prev) => ({ ...prev, [annotation._id]: e.target.value }))
                  }
                  placeholder="Add a comment..."
              />
                            <button type="submit">Add Comment</button>
                        </form>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AnnotationList;