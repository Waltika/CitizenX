import React from 'react';
import citizenxLogo from '../assets/citizenx-logo.png';
import './Footer.css';

interface FooterProps {
    url: string;
    isUrlLoading: boolean;
}

export const Footer: React.FC<FooterProps> = ({ url, isUrlLoading }) => {
    return (
        <div className="footer-container">
            <div className="logo-container">
                <a href="https://citizenx.app" target="_blank" rel="noopener noreferrer">
                    <img src={citizenxLogo} alt="CitizenX Logo" className="citizenx-logo" />
                </a>
            </div>
            <div className="url-footer">
                <p className="url-text">
                    Annotating: <span className="url">{isUrlLoading || !url ? 'Loading URL...' : url}</span>
                </p>
            </div>
        </div>
    );
};