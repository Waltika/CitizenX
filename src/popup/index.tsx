// src/popup/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { NotificationList } from './components/Notification/List';
import { AnnotationList } from './components/Annotation/List';
import { HistoryList } from './components/History/List';
import { Profile } from './components/Settings/Profile';
import { Login } from './components/Auth/Login';
import { Logout } from './components/Auth/Logout';
import '../styles/popup.css'; // Assuming a CSS file for popup styling

const Popup: React.FC = () => {
    return (
        <div className="popup-container">
            <h1>CitizenX</h1>
            <Login />
            <Logout />
            <Profile />
            <NotificationList />
            <AnnotationList />
            <HistoryList />
        </div>
    );
};

// Render the popup
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<Popup />);