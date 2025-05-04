// src/hooks/useProfileModal.ts
import { useState } from 'react';
export function useProfileModal({ profile, createProfile, updateProfile, }) {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [newHandle, setNewHandle] = useState('');
    const [newProfilePicture, setNewProfilePicture] = useState('');
    const [profileError, setProfileError] = useState('');
    const handleProfileSubmit = async () => {
        try {
            if (!newHandle || !newProfilePicture) {
                setProfileError('Please provide a handle and profile picture');
                return;
            }
            if (profile) {
                await updateProfile(newHandle, newProfilePicture);
            }
            else {
                await createProfile(newHandle, newProfilePicture);
            }
            setIsProfileModalOpen(false);
            setNewHandle('');
            setNewProfilePicture('');
        }
        catch (err) {
            setProfileError(err.message);
        }
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setNewProfilePicture(event.target.result);
                    console.log('useProfileModal: Loaded profile picture');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    return {
        isProfileModalOpen,
        setIsProfileModalOpen,
        newHandle,
        setNewHandle,
        newProfilePicture,
        setNewProfilePicture,
        profileError,
        setProfileError,
        handleProfileSubmit,
        handleFileChange,
    };
}
