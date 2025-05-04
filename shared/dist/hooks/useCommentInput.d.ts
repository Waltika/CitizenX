interface UseCommentInputProps {
    onSaveComment?: (annotationId: string, content: string) => Promise<void>;
}
interface UseCommentInputResult {
    commentInputs: {
        [key: string]: string;
    };
    handleCommentChange: (annotationId: string, value: string) => void;
    handleSaveComment: (annotationId: string) => Promise<void>;
}
export declare function useCommentInput({ onSaveComment }: UseCommentInputProps): UseCommentInputResult;
export {};
