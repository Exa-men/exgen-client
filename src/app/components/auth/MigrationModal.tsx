"use client";

import React, { useState, useRef } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface MigrationModalProps {
  email: string;
  onClose: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ email, onClose }) => {
  const { signIn, isLoaded } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [step, setStep] = useState<'detection' | 'creation' | 'reset' | 'error'>('detection');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const lastResendTime = useRef<number>(0);

  // Rate limiting: max 1 resend per 2 minutes
  const RESEND_COOLDOWN = 2 * 60 * 1000; // 2 minutes in milliseconds

  const startResendCountdown = () => {
    setResendDisabled(true);
    setResendCountdown(120); // 2 minutes
    
    const interval = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    const now = Date.now();
    if (now - lastResendTime.current < RESEND_COOLDOWN) {
      return; // Still in cooldown
    }

    console.log('=== RESEND EMAIL START ===');
    setIsResending(true);
    lastResendTime.current = now;
    startResendCountdown();

    try {
      if (!signIn) {
        throw new Error('SignIn is not available');
      }

      // Create new sign-in attempt for resend
      const redirectUrl = `${window.location.origin}/reset-password`;
      const signInAttempt = await signIn.create({
        identifier: email,
        strategy: 'email_link',
        redirectUrl: redirectUrl
      });

      const supportedFactors = signInAttempt.supportedFirstFactors || [];
      const emailLinkFactor = supportedFactors.find(
        factor => factor.strategy === 'email_link'
      );

      if (!emailLinkFactor) {
        throw new Error('Email link factor not found');
      }

      // Send email in background
      signIn.createEmailLinkFlow().startEmailLinkFlow({
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: redirectUrl
      }).then(result => {
        console.log('Resend email link flow completed:', result);
      }).catch(error => {
        console.log('Resend email link flow error (non-blocking):', error);
      });

      console.log('=== RESEND EMAIL SENT ===');
    } catch (error: any) {
      console.error('=== RESEND EMAIL FAILED ===', error);
      setResendDisabled(false);
      setResendCountdown(0);
    } finally {
      setIsResending(false);
    }
  };

  const handleStartMigration = async () => {
    console.log('=== MIGRATION START ===');
    console.log('Email:', email);
    console.log('Is loaded:', isLoaded);
    console.log('SignIn object:', signIn);
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      console.log('=== STEP 1: CREATE USER IN CLERK (BACKEND) ===');
      // 1. Create user in Clerk (backend)
      const createResponse = await fetch('/api/v1/auth/create-clerk-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      console.log('Create response status:', createResponse.status);
      console.log('Create response ok:', createResponse.ok);
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Backend error:', errorData);
        setErrorMessage(errorData.detail || 'Er is een fout opgetreden tijdens de migratie.');
        setStep('error');
        return;
      }

      const createData = await createResponse.json();
      console.log('Backend success:', createData);

      console.log('=== STEP 2: SEND EMAIL LINK (FRONTEND) ===');
      
      if (!signIn) {
        throw new Error('SignIn is not available');
      }
      
      // Step 2A: Create sign-in attempt
      console.log('=== STEP 2A: CREATE SIGN-IN ATTEMPT ===');
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Redirect URL:', redirectUrl);
      
      const signInAttempt = await signIn.create({
        identifier: email,
        strategy: 'email_link',
        redirectUrl: redirectUrl
      });
      
      console.log('Sign-in attempt created:', signInAttempt);
      console.log('Supported first factors:', signInAttempt.supportedFirstFactors);
      
      // Step 2B: Find email link factor
      console.log('=== STEP 2B: FIND EMAIL LINK FACTOR ===');
      const supportedFactors = signInAttempt.supportedFirstFactors || [];
      const emailLinkFactor = supportedFactors.find(
        factor => factor.strategy === 'email_link'
      );
      
      if (!emailLinkFactor) {
        throw new Error('Email link factor not found');
      }
      
      console.log('Email link factor:', emailLinkFactor);
      
      // Step 2C: Send email link (fire and forget)
      console.log('=== STEP 2C: SEND EMAIL LINK ===');
      console.log('Email address ID:', emailLinkFactor.emailAddressId);
      
      // Send email in background (don't wait for it)
      signIn.createEmailLinkFlow().startEmailLinkFlow({
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: redirectUrl
      }).then(result => {
        console.log('Email link flow completed:', result);
      }).catch(error => {
        console.log('Email link flow error (non-blocking):', error);
      });
      
      console.log('=== EMAIL SENDING STARTED (BACKGROUND) ===');
      
      // Start cooldown for resend button
      lastResendTime.current = Date.now();
      startResendCountdown();
      
      setStep('reset');
    } catch (error: any) {
      console.error('=== MIGRATION FAILED ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setErrorMessage('Er is een fout opgetreden tijdens de migratie. Probeer het opnieuw.');
      setStep('error');
    } finally {
      console.log('=== MIGRATION COMPLETE ===');
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'detection':
        return (
          <div>
            <div className="mb-4">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold text-center mb-2">
                Welkom bij het nieuwe platform!
              </h2>
            </div>
            <p className="mb-4 text-gray-600 text-center">
              We hebben je account gevonden in ons systeem. 
              Om je toegang te geven tot het nieuwe platform, 
              moeten we je wachtwoord resetten.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm text-center">
                Je ontvangt een e-mail met instructies om je wachtwoord te resetten.
              </p>
            </div>
            <Button 
              onClick={handleStartMigration} 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                'Wachtwoord resetten'
              )}
            </Button>
          </div>
        );

      case 'reset':
        return (
          <div>
            <div className="mb-4">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h2 className="text-xl font-semibold text-center mb-2">
                Wachtwoord reset succesvol!
              </h2>
            </div>
            <p className="mb-4 text-gray-600 text-center">
              We hebben een e-mail verzonden naar{' '}
              <span className="font-medium text-gray-900">{email}</span>{' '}
              met instructies om je wachtwoord te resetten.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm text-center">
                <strong>Let op:</strong> Het kan enkele minuten duren voordat je de e-mail ontvangt. 
                Controleer je inbox en spam folder. Klik op de link in de e-mail om je wachtwoord in te stellen.
                <br /><br />
                <strong>Tip:</strong> Als je geen e-mail ontvangt, klik dan op "E-mail opnieuw verzenden" of neem contact op met support@exa.men.
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Sluiten
              </Button>
              <Button 
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={isResending || resendDisabled}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    E-mail verzenden...
                  </>
                ) : resendDisabled ? (
                  `E-mail opnieuw verzenden (${Math.floor(resendCountdown / 60)}:${(resendCountdown % 60).toString().padStart(2, '0')})`
                ) : (
                  'E-mail opnieuw verzenden'
                )}
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div>
            <div className="mb-4">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h2 className="text-xl font-semibold text-center mb-2">
                Migratie mislukt
              </h2>
            </div>
            <p className="mb-4 text-gray-600 text-center">
              {errorMessage}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="red-800 text-sm text-center">
                Probeer het opnieuw of neem contact op met de support als het probleem aanhoudt.
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => setStep('detection')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Opnieuw proberen
              </Button>
              <Button 
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Sluiten
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}; 