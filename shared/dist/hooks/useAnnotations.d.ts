import { AnnotationType, ProfileType } from '../types';
interface UseAnnotationsProps {
    url: string;
    did: string | null;
}
interface UseAnnotationsReturn {
    annotations: AnnotationType[];
    profiles: Record<string, ProfileType>;
    error: string | null;
    loading: boolean;
    handleSaveAnnotation: (content: string) => Promise<void>;
    handleDeleteAnnotation: (id: string) => Promise<void>;
    handleSaveComment: (annotationId: string, content: string) => Promise<void>;
}
export declare const useAnnotations: ({ url, did }: UseAnnotationsProps) => UseAnnotationsReturn;
export {};
