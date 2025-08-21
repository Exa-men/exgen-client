"use client";

import React, { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

export const EmailVerificationForm: React.FC = () => {
  const { signUp, isLoaded } = useSignUp();
  const { switchModalMode } = useAuthModal();
  




  return (
    <div className="w-full mx-auto text-center">
      <div className="mb-6">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          We hebben een verificatie link verzonden naar je e-mailadres
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <p className="text-blue-800 text-sm font-medium">
              Controleer je inbox
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Klik op de link in de e-mail om je account te activeren. 
              Na verificatie kun je inloggen op je account.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => switchModalMode('sign-in')}
          variant="outline"
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar inloggen
        </Button>
        
        <div className="text-sm text-gray-600 text-left">
          <p className="mb-2">Geen e-mail ontvangen?</p>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Controleer je spam/junk folder
            </p>
            <p className="text-xs text-gray-500">
              Wacht enkele minuten - e-mails kunnen vertraagd zijn
            </p>
          </div>
        </div>


      </div>
    </div>
  );
}; 