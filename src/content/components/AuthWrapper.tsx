// src/content/components/AuthWrapper.tsx
import React, { useState, useEffect } from 'react';
import { authService } from '../../background/services/auth';
import { AnnotationCreate } from './AnnotationCreate';
import { AnnotationDisplay } from './AnnotationDisplay';
import '../styles/components/AuthWrapper.module.css';

interface AuthWrapperProps {
    url: string;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ url }) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authService.getCurrentUser().then((user) => {
            setUserId(user?.uid || null);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!userId) {
        return <div>Please log in to view or create annotations.</div>;
    }

    return (
        <div className="auth-wrapper">
            <AnnotationCreate url={url} userId={userId} />
            <AnnotationDisplay url={url} />
        </div>
    );
};