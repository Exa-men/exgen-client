"use client";

import React from 'react';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { EmailVerificationForm } from './EmailVerificationForm';
import { X } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { modalState, closeAuthModal } = useAuthModal();

  const getModalTitle = () => {
    switch (modalState.mode) {
      case 'sign-in':
        return 'Inloggen';
      case 'sign-up':
        return 'Account aanmaken';
      case 'forgot-password':
        return 'Wachtwoord vergeten';
      case 'verification-sent':
        return 'E-mail verificatie';
      default:
        return 'Inloggen';
    }
  };

  const renderModalContent = () => {
    switch (modalState.mode) {
      case 'sign-in':
        return <SignInForm />;
      case 'sign-up':
        return <SignUpForm />;
      case 'forgot-password':
        return <ForgotPasswordForm />;
      case 'verification-sent':
        return <EmailVerificationForm />;
      default:
        return <SignInForm />;
    }
  };

  if (!modalState.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {getModalTitle()}
          </h2>
          <button
            onClick={closeAuthModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
}; 