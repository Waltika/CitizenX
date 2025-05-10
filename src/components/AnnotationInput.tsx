import React, { useState, useEffect, useRef, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import CameraIcon from '../assets/CameraIcon.svg';
import './annotation-input.css';

interface AnnotationInputProps {
    onSave: (content: string, tabId?: number, captureScreenshot?: boolean) => Promise<void>;
    tabId?: number;
    onShowToast: (message: string) => void;
}

export const AnnotationInput: React.FC<AnnotationInputProps> = ({ onSave, tabId: originalTabId, onShowToast }) => {
    const [annotationText, setAnnotationText] = useState('');
    const [captureScreenshot, setCaptureScreenshot] = useState<boolean>(true);
    const editorRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);

    useEffect(() => {
        console.log('AnnotationInput: Initializing Quill editor');
        if (editorRef.current && !quillRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link'],
                    ],
                },
                placeholder: 'Enter annotation...',
            });

            quillRef.current.on('text-change', () => {
                const content = quillRef.current?.root.innerHTML || '';
                setAnnotationText(content === '<p><br></p>' ? '' : content);
            });
        }

        return () => {
            if (quillRef.current) {
                quillRef.current.off('text-change');
                quillRef.current = null;
            }
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!annotationText.trim()) return;

        let validatedTabId: number | undefined = undefined;
        if (captureScreenshot && typeof chrome !== 'undefined' && chrome.tabs && originalTabId) {
            try {
                const tab = await new Promise<chrome.tabs.Tab>((resolve, reject) => {
                    chrome.tabs.get(originalTabId, (tab) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(tab);
                        }
                    });
                });
                if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                    console.log('AnnotationInput: Screenshot capture enabled, validating tabId:', tab.id);
                    validatedTabId = tab.id;
                } else {
                    console.log('AnnotationInput: Cannot capture screenshot for this page');
                    onShowToast('Cannot capture screenshot for this page');
                }
            } catch (error) {
                console.error('AnnotationInput: Failed to validate tabId:', error);
                onShowToast('Failed to access tab for screenshot');
            }
        } else if (!captureScreenshot) {
            console.log('AnnotationInput: Screenshot capture disabled');
        } else if (!originalTabId) {
            console.log('AnnotationInput: No active tab available for screenshot');
            onShowToast('No active tab available for screenshot');
        }

        try {
            console.log('AnnotationInput: Saving annotation - content:', annotationText, 'captureScreenshot:', captureScreenshot, 'validatedTabId:', validatedTabId);
            await onSave(annotationText, validatedTabId, captureScreenshot);
            setAnnotationText('');
            if (quillRef.current) {
                quillRef.current.setContents([]);
            }
        } catch (error) {
            console.error('AnnotationInput: Failed to save annotation:', error);
            onShowToast('Failed to save annotation');
        }
    }, [annotationText, originalTabId, onSave, captureScreenshot, onShowToast]);

    const toggleScreenshotCapture = useCallback(() => {
        setCaptureScreenshot((prev) => !prev);
    }, []);

    return (
        <div className="annotation-input">
            <div ref={editorRef} className="quill-editor"></div>
            <div className="button-group">
                <button
                    onClick={toggleScreenshotCapture}
                    className={`screenshot-toggle-button ${captureScreenshot ? 'active' : ''}`}
                    title="Capture the visible part of the annotated page"
                >
                    <CameraIcon className="camera-icon" width="16" height="16" />
                    <span className="tooltip">Capture the visible part of the annotated page</span>
                </button>
                <button
                    onClick={handleSave}
                    className="annotation-save-button"
                    disabled={!annotationText.trim()}
                >
                    Save
                </button>
            </div>
        </div>
    );
};