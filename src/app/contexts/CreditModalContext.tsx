"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CreditModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CreditModalContext = createContext<CreditModalContextType | undefined>(undefined);

export const useCreditModal = () => {
  const context = useContext(CreditModalContext);
  if (context === undefined) {
    throw new Error('useCreditModal must be used within a CreditModalProvider');
  }
  return context;
};

interface CreditModalProviderProps {
  children: ReactNode;
}

export const CreditModalProvider: React.FC<CreditModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const value = {
    isOpen,
    openModal,
    closeModal
  };

  return (
    <CreditModalContext.Provider value={value}>
      {children}
    </CreditModalContext.Provider>
  );
}; 