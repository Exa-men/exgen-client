"use client";

import React, { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

export const EmailVerificationForm: React.FC = () => {
  const { signUp, isLoaded } = useSignUp();
  const { switchModalMode, closeAuthModal } = useAuthModal();
  
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get the email link flow
  const { startEmailLinkFlow } = signUp?.createEmailLinkFlow() || {};

  const handleResendVerification = async () => {
    console.log('=== RESEND VERIFICATION START ===');
    console.log('Is loaded:', isLoaded);
    console.log('startEmailLinkFlow function:', startEmailLinkFlow);
    
    if (!isLoaded || !startEmailLinkFlow) {
      console.error('Cannot resend: not loaded or startEmailLinkFlow not available');
      return;
    }

    setIsResending(true);
    
    try {
      // Dynamically set the host domain for dev and prod
      const protocol = window.location.protocol;
      const host = window.location.host;
      console.log('Redirect URL will be:', `${protocol}//${host}/sign-up/verify`);

      console.log('Calling prepareEmailAddressVerification for resend...');
      
      // Use the same approach that works for sign-up
      const resendResult = await signUp.prepareEmailAddressVerification({
        strategy: 'email_link',
        redirectUrl: `${protocol}//${host}/sign-up/verify`,
      });
      
      console.log('=== RESEND VERIFICATION RESULT ===');
      console.log('Resend result:', resendResult);
      console.log('Resend status:', resendResult.status);
      
      setResendSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (error: any) {
      console.error('=== RESEND VERIFICATION ERROR ===');
      console.error('Resend verification error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } finally {
      console.log('Resend process finished, setting isResending to false');
      setIsResending(false);
    }
  };

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
        
        <div className="text-sm text-gray-600">
          <p className="mb-2">Geen e-mail ontvangen?</p>
          <Button
            onClick={handleResendVerification}
            variant="ghost"
            size="sm"
            disabled={isResending}
            className="text-examen-cyan hover:text-examen-cyan-600"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Verzenden...
              </>
            ) : (
              'Verificatie e-mail opnieuw verzenden'
            )}
          </Button>
        </div>

        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">
              ✓ Verificatie e-mail opnieuw verzonden!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 