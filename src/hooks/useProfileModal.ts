// src/hooks/useProfileModal.ts
import { useState } from 'react';

interface UseProfileModalProps {
  profile: { handle: string; profilePicture: string } | null;
  createProfile: (handle: string, profilePicture: string) => Promise<void>;
  updateProfile: (handle: string, profilePicture: string) => Promise<void>;
}

interface UseProfileModalResult {
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newHandle: string;
  setNewHandle: React.Dispatch<React.SetStateAction<string>>;
  newProfilePicture: string;
  setNewProfilePicture: React.Dispatch<React.SetStateAction<string>>;
  profileError: string;
  setProfileError: React.Dispatch<React.SetStateAction<string>>;
  handleProfileSubmit: () => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useProfileModal({
                                  profile,
                                  createProfile,
                                  updateProfile,
                                }: UseProfileModalProps): UseProfileModalResult {
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
      } else {
        await createProfile(newHandle, newProfilePicture);
      }
      setIsProfileModalOpen(false);
      setNewHandle('');
      setNewProfilePicture('');
    } catch (err) {
      setProfileError((err as Error).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewProfilePicture(event.target.result as string);
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