// src/sidepanel/components/Auth/Logout.tsx
import React from 'react';
import { authService } from '../../../background/services/auth';

const Logout: React.FC = () => {
    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <div className="logout-container">
            <button onClick={handleLogout} className="logout-button">
                Logout
            </button>
        </div>
    );
};

export { Logout };