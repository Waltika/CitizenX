import { AnnotationType } from '../types/index.js';
interface GetAnnotationsServerProps {
    gun: any;
    url: string;
    normalizeUrl: (url: string) => string;
}
export declare function getAnnotationsServer({ gun, url, normalizeUrl }: GetAnnotationsServerProps): Promise<AnnotationType[]>;
export {};
