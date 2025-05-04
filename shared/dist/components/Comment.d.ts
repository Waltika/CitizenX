import React from 'react';
import { CommentType, ProfileType } from '../types';
interface CommentProps {
    comment: CommentType;
    profiles: Record<string, ProfileType>;
}
export declare const Comment: React.FC<CommentProps>;
export {};
