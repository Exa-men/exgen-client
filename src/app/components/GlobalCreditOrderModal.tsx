"use client"

import React from 'react';
import { useCredits } from '../contexts/CreditContext';
import CreditOrderModal from './CreditOrderModal';

const GlobalCreditOrderModal: React.FC = () => {
  const { creditOrderModalOpen, closeCreditOrderModal } = useCredits();

  return (
    <CreditOrderModal
      isOpen={creditOrderModalOpen}
      onClose={closeCreditOrderModal}
    />
  );
};

export default GlobalCreditOrderModal; 