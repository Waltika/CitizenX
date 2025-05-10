import React from 'react';
import { AnnotationList } from './AnnotationList';
import { Annotation, Profile } from '@/types';
import './LoadingSpinner.css';

interface AnnotationListWrapperProps {
    annotations: Annotation[];
    profiles: Record<string, Profile>;
    annotationsError: string | null;
    annotationsLoading: boolean;
    isUrlLoading: boolean;
    onDelete: (id: string) => Promise<void>;
    onDeleteComment?: (annotationId: string, commentId: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
    currentUrl: string;
    onShowToast: (message: string) => void;
}

export const AnnotationListWrapper: React.FC<AnnotationListWrapperProps> = ({
                                                                                annotations,
                                                                                profiles,
                                                                                annotationsError,
                                                                                annotationsLoading,
                                                                                isUrlLoading,
                                                                                onDelete,
                                                                                onDeleteComment,
                                                                                onSaveComment,
                                                                                currentUrl,
                                                                                onShowToast,
                                                                            }) => {
    return (
        <div className="annotation-list-wrapper">
            {annotationsError && <div className="error-text">{annotationsError}</div>}
            <>
                <AnnotationList
                    annotations={annotations}
                    profiles={profiles}
                    onDelete={onDelete}
                    onDeleteComment={onDeleteComment}
                    onSaveComment={onSaveComment}
                    currentUrl={currentUrl}
                    onShowToast={onShowToast}
                />
            </>
        </div>
    );
};