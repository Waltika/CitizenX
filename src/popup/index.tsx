// src/popup/index.tsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileSettings } from './components/Settings/Profile';
import './styles/global.css';

const App: React.FC = () => {
    const [uid] = useState('test-user'); // Placeholder UID, to be replaced with MetaMask/anonymous ID

    return (
        <div>
            <h1>CitizenX Annotations</h1>
            <ProfileSettings uid={uid} />
        </div>
    );
};

const root = createRoot(document.getElementById('citizenx-app')!);
root.render(<App />);