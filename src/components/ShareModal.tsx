import React from 'react';
import XIcon from '../assets/XIcon.svg'; // Import the SVG as a React component
import FacebookIcon from '../assets/FacebookIcon.svg'; // Import the SVG as a React component
import WhatsAppIcon from '../assets/WhatsAppIcon.svg'; // Import the SVG as a React component
import TelegramIcon from '../assets/TelegramIcon.svg'; // Import the SVG as a React component
import EmailIcon from '../assets/EmailIcon.svg'; // Import the SVG as a React component
import CopyIcon from '../assets/CopyIcon.svg'; // Import the SVG as a React component
import './ShareModal.css';

interface ShareModalProps {
    showShareModal: string;
    shareError: string | null;
    onClose: () => void;
    onCopyLink: (shareContent: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ showShareModal, shareError, onClose, onCopyLink }) => {
    const generateShareLink = (platform: string, shareText: string, shareUrl: string) => {
        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(shareUrl);
        switch (platform) {
            case 'x':
                return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
            case 'facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}"e=${encodedText}`;
            case 'whatsapp':
                return `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
            case 'telegram':
                return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
            case 'email':
                return `mailto:?subject=CitizenX%20Annotation&body=${encodedText}%20${encodedUrl}`;
            default:
                return '#';
        }
    };

    return (
        <div className="share-modal">
            <div className="share-modal-content">
                <h3>Share Annotation</h3>
                {shareError && <p className="error-text">{shareError}</p>}
                <div className="share-buttons">
                    <a
                        href={generateShareLink('x', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-button-social share-x"
                        title="Share on X"
                    >
                        <XIcon />
                        <span>X (Twitter)</span>
                    </a>
                    <a
                        href={generateShareLink('facebook', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-button-social share-facebook"
                        title="Share on Facebook"
                    >
                        <FacebookIcon />
                        <span>Facebook</span>
                    </a>
                    <a
                        href={generateShareLink('whatsapp', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-button-social share-whatsapp"
                        title="Share on WhatsApp"
                    >
                        <WhatsAppIcon />
                        <span>WhatsApp</span>
                    </a>
                    <a
                        href={generateShareLink('telegram', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-button-social share-telegram"
                        title="Share on Telegram"
                    >
                        <TelegramIcon />
                        <span>Telegram</span>
                    </a>
                    <a
                        href={generateShareLink('email', showShareModal.split(' ').slice(0, -1).join(' '), showShareModal.split(' ').pop() || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="share-button-social share-email"
                        title="Share via Email"
                    >
                        <EmailIcon />
                        <span>Email</span>
                    </a>
                    <button
                        onClick={() => onCopyLink(showShareModal)}
                        className="share-button-social share-copy"
                        title="Copy Message"
                    >
                        <CopyIcon />
                        <span>Copy Message</span>
                    </button>
                </div>
                <button onClick={onClose} className="share-modal-close">
                    Close
                </button>
            </div>
        </div>
    );
};