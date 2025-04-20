// src/popup/components/Auth/Logout.tsx
import React from 'react';
import { authService } from '../../../background/services/auth';
import '../../styles/components/Auth.module.css';

export const Logout: React.FC = () => {
    const handleLogout = async () => {
        try {
            await authService.logout();
            // Optionally redirect or update UI
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="logout-form">
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};