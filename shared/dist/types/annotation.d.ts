export interface Comment {
    _id: string;
    text: string;
    timestamp: number;
    did: string;
    source?: 'orbitdb' | 'local';
}
export interface Annotation {
    _id: string;
    url: string;
    text: string;
    timestamp: number;
    did: string;
    comments: Comment[];
    source?: 'orbitdb' | 'local';
}
