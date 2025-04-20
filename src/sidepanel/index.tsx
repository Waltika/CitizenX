// src/sidepanel/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Login } from './components/Auth/Login';
import { Logout } from './components/Auth/Logout';
import { Profile } from './components/Settings/Profile';
import { NotificationList } from './components/Notification/List';
import { AnnotationList } from './components/Annotation/List';
import { HistoryList } from './components/History/List';
import { authService } from '../background/services/auth';
import './styles/sidepanel.css';

const SidePanel: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('SidePanel: Checking authentication status...');
        authService
            .isAuthenticated()
            .then((authenticated: boolean) => {
                console.log('SidePanel: Authentication status:', authenticated);
                setIsAuthenticated(authenticated);
                if (authenticated) {
                    authService.getUserId().then((id) => {
                        console.log('SidePanel: User ID:', id);
                        setUserId(id || 'test-user');
                    }).catch((err) => {
                        console.error('SidePanel: Failed to get user ID:', err);
                        setError('Failed to load user ID: ' + err.message);
                        setIsAuthenticated(false);
                    });
                } else {
                    setIsAuthenticated(false);
                }
            })
            .catch((err) => {
                console.error('SidePanel: Authentication check failed:', err);
                setError('Failed to check authentication status: ' + err.message);
                setIsAuthenticated(false);
            });

        console.log('SidePanel: Querying active tab...');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                console.log('SidePanel: Active tab URL:', tabs[0].url);
                setCurrentUrl(tabs[0].url);
            } else {
                console.warn('SidePanel: No active tab URL found');
            }
        });
    }, []);

    if (isAuthenticated === null && !error) {
        return (
            <div className="sidepanel-container">
                <h1>CitizenX</h1>
                <p>Loading authentication...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sidepanel-container">
                <h1>CitizenX</h1>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="sidepanel-container">
            <h1>CitizenX</h1>
            {isAuthenticated && userId ? (
                <>
                    <Profile userId={userId} />
                    <NotificationList />
                    <AnnotationList userId={userId} url={currentUrl} />
                    <HistoryList />
                    <Logout />
                </>
            ) : (
                <Login />
            )}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    console.log('SidePanel: Mounting to root container');
    const root = createRoot(container);
    root.render(<SidePanel />);
} else {
    console.error('SidePanel: Root container not found');
}