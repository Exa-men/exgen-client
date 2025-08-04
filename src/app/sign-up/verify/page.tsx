"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSignUp, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function SignUpVerifyContent() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { handleEmailLinkVerification } = useClerk();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log('=== VERIFICATION DEBUG START ===');
    console.log('isLoaded:', isLoaded);
    console.log('signUp object:', signUp);
    console.log('signUp?.status:', signUp?.status);
    console.log('signUp?.id:', signUp?.id);
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    console.log('verificationStatus:', verificationStatus);
    
    if (!isLoaded) {
      console.log('Not loaded yet, returning early');
      return;
    }

    const verifyEmailLink = async () => {
      console.log('=== STARTING VERIFICATION PROCESS ===');
      console.log('About to call handleEmailLinkVerification...');
      
      try {
        // Handle the email link verification
        console.log('Calling handleEmailLinkVerification with redirectUrl:', `${window.location.origin}/sign-up/verify`);
        await handleEmailLinkVerification({
          redirectUrl: `${window.location.origin}/sign-up/verify`
        });
        console.log('handleEmailLinkVerification completed successfully');
        
        // Check if signup is complete after verification
        console.log('Checking signup status after verification...');
        console.log('signUp?.status:', signUp?.status);
        console.log('signUp?.createdSessionId:', signUp?.createdSessionId);
        
        if (signUp && signUp.status === 'complete') {
          console.log('Signup is complete, setting active session...');
          // Set the session as active
          await setActive({ session: signUp.createdSessionId });
          console.log('Session set active successfully');
          setVerificationStatus('success');
          console.log('Setting verification status to success');
          setTimeout(() => {
            console.log('Redirecting to catalogus...');
            router.push('/catalogus');
          }, 2000);
        } else if (signUp && signUp.status === 'missing_requirements') {
          console.log('Signup missing requirements');
          setVerificationStatus('error');
          setErrorMessage('Verificatie nog niet voltooid. Controleer je e-mail en klik op de link.');
        } else if (signUp && signUp.status === 'abandoned') {
          console.log('Signup abandoned');
          setVerificationStatus('error');
          setErrorMessage('Verificatie is verlopen. Probeer opnieuw in te schrijven.');
        } else {
          console.log('Signup still processing, status:', signUp?.status);
          // Still processing
          setVerificationStatus('loading');
        }
      } catch (err: any) {
        console.error('=== VERIFICATION ERROR ===');
        console.error('Error type:', typeof err);
        console.error('Error message:', err.message);
        console.error('Error code:', err.errors?.[0]?.code);
        console.error('Error details:', err.errors);
        console.error('Full error object:', err);
        setVerificationStatus('error');
        setErrorMessage('Verificatie mislukt. Probeer het opnieuw of neem contact op met de beheerder.');
      }
    };

    console.log('Calling verifyEmailLink function...');
    verifyEmailLink();
    console.log('=== VERIFICATION DEBUG END ===');
  }, [isLoaded, signUp, setActive, handleEmailLinkVerification, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {verificationStatus === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              E-mailadres verifiëren
            </h1>
            <p className="text-gray-600">
              We verifiëren je e-mailadres...
            </p>
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Verificatie succesvol!
            </h1>
            <p className="text-gray-600 mb-4">
              Je e-mailadres is geverifieerd. Je wordt automatisch doorgestuurd naar de dashboard.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                Je account is nu actief en je kunt inloggen.
              </p>
            </div>
          </>
        )}

        {verificationStatus === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Verificatie mislukt
            </h1>
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">
                Als je problemen ondervindt, neem dan contact op met de beheerder.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white py-2 px-4 rounded-lg font-medium"
            >
              Terug naar homepage
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Laden...</p>
      </div>
    </div>
  );
}

export default function SignUpVerifyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignUpVerifyContent />
    </Suspense>
  );
} 