// src/popup/components/Auth/Login.tsx
import React, { useState } from 'react';
import { authService } from '../../../background/services/auth';
import '../../styles/components/Auth.module.css';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            await authService.login(email, password);
            setError('');
            // Optionally redirect or update UI
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <div className="login-form">
            <h2>Login</h2>
            {error && <p className="error">{error}</p>}
            <div>
                <label>
                    Email:
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                </label>
                <label>
                    Password:
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                    />
                </label>
                <button onClick={handleLogin}>Login</button>
            </div>
        </div>
    );
};