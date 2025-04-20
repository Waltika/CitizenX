// src/sidepanel/components/Auth/Login.tsx
import React, { useState } from 'react';
import { authService } from '../../../background/services/auth';

export const Login: React.FC = () => {
    const [userId, setUserId] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            await authService.login(userId, ''); // Password ignored
            setError('');
        } catch (err) {
            setError('Login failed');
            console.error('Login error:', err);
        }
    };

    return (
        <div style={{
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <h2>Login</h2>
            {error && <p style={{ color: 'red', fontSize: '12px', margin: '5px 0' }}>{error}</p>}
            <div>
                <label>
                    User ID:
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter your user ID"
                        style={{
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </label>
                <button
                    onClick={handleLogin}
                    style={{
                        padding: '8px',
                        fontSize: '14px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Login
                </button>
            </div>
        </div>
    );
};