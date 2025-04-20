// src/popup/index.tsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Login } from './components/Auth/Login';
import { Logout } from './components/Auth/Logout';
import { Profile } from './components/Settings/Profile';
import { NotificationList } from './components/Notification/List';
import { AnnotationList } from './components/Annotation/List';
import { HistoryList } from './components/History/List';
import { authService } from '../background/services/auth';
import '../styles/popup.css';

const Popup: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState<string>('');

    useEffect(() => {
        // Check authentication status (replace checkAuth with actual method name)
        authService.isAuthenticated().then((authenticated: boolean) => {
            setIsAuthenticated(authenticated);
            if (authenticated) {
                // Fetch userId (mocked or from authService)
                setUserId('test-user'); // Replace with authService.getUserId() if available
            }
        });

        // Get current tab's URL
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                setCurrentUrl(tabs[0].url);
            }
        });
    }, []);

    return (
        <div className="popup-container">
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

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<Popup />);