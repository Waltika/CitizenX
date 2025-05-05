import React from 'react';
import { AnnotationType, ProfileType } from '../types';
export interface AnnotationListProps {
    annotations: AnnotationType[];
    profiles: Record<string, ProfileType>;
    onDelete: (id: string) => Promise<void>;
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}
export declare const AnnotationList: React.FC<AnnotationListProps>;
