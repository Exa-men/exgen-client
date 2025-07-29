"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ModalMode = 
  | 'sign-in'
  | 'sign-up'
  | 'email-verification'
  | 'forgot-password'
  | 'reset-password'
  | 'verification-sent'
  | 'reset-sent';

interface AuthModalState {
  isOpen: boolean;
  mode: ModalMode;
  onSuccess?: () => void;
}

interface AuthModalContextType {
  modalState: AuthModalState;
  openAuthModal: (mode: ModalMode, onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  switchModalMode: (mode: ModalMode) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<AuthModalState>({
    isOpen: false,
    mode: 'sign-in'
  });

  const openAuthModal = (mode: ModalMode, onSuccess?: () => void) => {
    setModalState({
      isOpen: true,
      mode,
      onSuccess
    });
  };

  const closeAuthModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const switchModalMode = (mode: ModalMode) => {
    setModalState(prev => ({
      ...prev,
      mode
    }));
  };

  const value: AuthModalContextType = {
    modalState,
    openAuthModal,
    closeAuthModal,
    switchModalMode
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}; 