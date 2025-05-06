import React, { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
    message: string;
    isVisible: boolean;
    setIsVisible: (visible: boolean) => void; // Add callback to reset visibility
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, setIsVisible }) => {
    // Automatically hide the toast after the animation duration (3 seconds)
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                setIsVisible(false); // Reset the visibility state after animation
            }, 3000); // Matches the animation duration in Toast.css

            return () => clearTimeout(timer); // Cleanup the timer on unmount
        }
    }, [isVisible, setIsVisible]);

    if (!isVisible) return null;

    return (
        <div className="toast">
            {message}
        </div>
    );
};