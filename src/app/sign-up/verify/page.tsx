"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function SignUpVerifyContent() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log('=== VERIFICATION PAGE LOADED ===');
    console.log('Is loaded:', isLoaded);
    console.log('SignUp object:', signUp);
    console.log('Current URL:', window.location.href);
    console.log('Search params:', searchParams.toString());
    
    if (!isLoaded || !signUp) {
      console.log('Not loaded or no signUp object yet');
      return;
    }

    console.log('=== SIGN-UP STATUS CHECK ===');
    console.log('SignUp status:', signUp.status);
    console.log('SignUp verifications:', signUp.verifications);
    console.log('SignUp requiredFields:', signUp.requiredFields);
    console.log('SignUp optionalFields:', signUp.optionalFields);
    console.log('SignUp id:', signUp.id);

    // Check if we have verification parameters in the URL
    const __clerk_ticket = searchParams.get('__clerk_ticket');
    const __clerk_status = searchParams.get('__clerk_status');
    
    console.log('=== URL PARAMETERS ===');
    console.log('__clerk_ticket:', __clerk_ticket);
    console.log('__clerk_status:', __clerk_status);
    console.log('__clerk_status type:', typeof __clerk_status);
    console.log('__clerk_status === "verified":', __clerk_status === 'verified');

    // Handle client_mismatch error specifically
    if (__clerk_status === 'client_mismatch') {
      console.log('=== CLIENT MISMATCH DETECTED ===');
      setVerificationStatus('error');
      setErrorMessage('De verificatie link is verlopen of niet geldig. Probeer opnieuw in te schrijven of gebruik de resend functie.');
      return;
    }

    // Handle successful verification
    if (__clerk_status === 'verified') {
      console.log('=== VERIFICATION SUCCESSFUL ===');
      console.log('Session created:', searchParams.get('__clerk_created_session'));
      setVerificationStatus('success');
      setTimeout(() => {
        router.push('/catalogus');
      }, 2000);
      return;
    }

    console.log('=== STATUS CHECKS COMPLETED ===');
    console.log('No specific status matched, checking for ticket...');

    // If we have a ticket, we need to attempt the verification
    if (__clerk_ticket) {
      console.log('=== ATTEMPTING VERIFICATION ===');
      handleVerification(__clerk_ticket);
    } else {
      console.log('=== NO TICKET FOUND, CHECKING STATUS ===');
      checkSignUpStatus();
    }
  }, [isLoaded, signUp, searchParams]);

  const handleVerification = async (ticket: string) => {
    if (!signUp) {
      console.error('SignUp object is undefined');
      setVerificationStatus('error');
      setErrorMessage('Verificatie mislukt: SignUp object niet beschikbaar');
      return;
    }

    try {
      console.log('Attempting verification with ticket:', ticket);
      
      // Attempt to verify the email address
      const result = await signUp.attemptEmailAddressVerification({
        code: ticket,
      });
      
      console.log('=== VERIFICATION RESULT ===');
      console.log('Verification result:', result);
      console.log('Result status:', result.status);
      console.log('Result verifications:', result.verifications);
      
      if (result.status === 'complete') {
        console.log('Verification successful!');
        setVerificationStatus('success');
        setTimeout(() => {
          router.push('/catalogus');
        }, 2000);
      } else {
        console.log('Verification failed, status:', result.status);
        setVerificationStatus('error');
        setErrorMessage('Verificatie mislukt. Probeer het opnieuw.');
      }
    } catch (error: any) {
      console.error('=== VERIFICATION ERROR ===');
      console.error('Verification error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setVerificationStatus('error');
      setErrorMessage(`Verificatie mislukt: ${error.message || 'Onbekende fout'}`);
    }
  };

  const checkSignUpStatus = () => {
    if (!signUp) {
      console.error('SignUp object is undefined');
      setVerificationStatus('error');
      setErrorMessage('Verificatie mislukt: SignUp object niet beschikbaar');
      return;
    }

    console.log('=== CHECKING SIGN-UP STATUS ===');
    
    if (signUp.status === 'complete') {
      console.log('Sign-up already complete');
      setVerificationStatus('success');
      setTimeout(() => {
        router.push('/catalogus');
      }, 2000);
    } else if (signUp.status === 'missing_requirements') {
      console.log('Sign-up missing requirements');
      setVerificationStatus('error');
      setErrorMessage('Verificatie nog niet voltooid. Controleer je e-mail en klik op de link.');
    } else {
      console.log('Sign-up status unknown:', signUp.status);
      setVerificationStatus('error');
      setErrorMessage('Verificatie mislukt. Probeer het opnieuw.');
    }
  };

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
                Probeer het opnieuw of neem contact op met de support.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Terug naar homepage
              </button>
              {searchParams.get('__clerk_status') === 'client_mismatch' && (
                <button
                  onClick={() => {
                    // Close the current page and trigger sign-up modal
                    window.close();
                    // If window.close() doesn't work, redirect to homepage with a flag
                    router.push('/?openSignUp=true');
                  }}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Opnieuw inschrijven
                </button>
              )}
            </div>
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