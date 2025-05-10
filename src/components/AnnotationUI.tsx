import React, { useState, useCallback } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAnnotations } from '../hooks/useAnnotations';
import { ProfileSection } from './ProfileSection';
import { AnnotationInput } from './AnnotationInput';
import { AnnotationListWrapper } from './AnnotationListWrapper';
import { Footer } from './Footer';
import { Toast } from './Toast';
import { useCommentDeduplication } from '../hooks/useCommentDeduplication';
import { useChromeMessageListener } from '../hooks/useChromeMessageListener';
import './styles/variables.css';
import './styles/common.css';
import './AnnotationUI.css';

interface AnnotationUIProps {
    url: string;
    isUrlLoading: boolean;
    tabId?: number;
}

export const AnnotationUI: React.FC<AnnotationUIProps> = ({ url, isUrlLoading, tabId }) => {
    const { did, profile, loading: profileLoading, error: profileError, authenticate, signOut, exportIdentity, importIdentity, createProfile, updateProfile } = useUserProfile();
    const { annotations: rawAnnotations, profiles, error: annotationsError, loading: annotationsLoading, handleSaveAnnotation, handleDeleteAnnotation, handleSaveComment: originalHandleSaveComment, handleDeleteComment } = useAnnotations({ url, did, tabId });
    const [toastMessage, setToastMessage] = useState<string>('');
    const [showToast, setShowToast] = useState<boolean>(false);

    const { validAnnotations, handleSaveComment } = useCommentDeduplication(rawAnnotations, url);
    useChromeMessageListener(url);

    const handleShowToast = useCallback((message: string) => {
        setToastMessage(message);
        setShowToast(true);
    }, []);

    const onDeleteCommentProp = did ? handleDeleteComment : undefined;
    const onSaveCommentProp = did ? (annotationId: string, content: string) => handleSaveComment(originalHandleSaveComment, annotationId, content) : undefined;

    return (
        <div className="annotation-ui-container">
            <ProfileSection
                did={did}
                profile={profile}
                profileLoading={profileLoading}
                profileError={profileError}
                authenticate={authenticate}
                signOut={signOut}
                exportIdentity={exportIdentity}
                importIdentity={importIdentity}
                createProfile={createProfile}
                updateProfile={updateProfile}
                onShowToast={handleShowToast}
            />
            <AnnotationInput
                onSave={handleSaveAnnotation}
                tabId={tabId}
                onShowToast={handleShowToast}
            />
            <AnnotationListWrapper
                annotations={validAnnotations}
                profiles={profiles}
                annotationsError={annotationsError}
                annotationsLoading={annotationsLoading}
                isUrlLoading={isUrlLoading}
                onDelete={handleDeleteAnnotation}
                onDeleteComment={onDeleteCommentProp}
                onSaveComment={onSaveCommentProp}
                currentUrl={url}
                onShowToast={handleShowToast}
            />
            <Toast
                message={toastMessage}
                isVisible={showToast}
                setIsVisible={setShowToast}
            />
            <Footer
                url={url}
                isUrlLoading={isUrlLoading}
            />
        </div>
    );
};