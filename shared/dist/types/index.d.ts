export interface ProfileType {
    did: string;
    handle: string;
    profilePicture?: string;
}
export interface CommentType {
    id: string;
    content: string;
    author: string;
    timestamp: number;
    authorHandle?: string;
}
export interface AnnotationType {
    id: string;
    url: string;
    content: string;
    author: string;
    timestamp: number;
    comments: CommentType[];
    authorHandle?: string;
    authorProfilePicture?: string;
}
