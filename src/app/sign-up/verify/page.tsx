"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSignUp, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function SignUpVerifyContent() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { handleEmailLinkVerification } = useClerk();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'password-reset-success' | 'migrated-user-success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    const verifyEmailLink = async () => {
      try {
        // Extract session ID and flow type from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const createdSessionId = urlParams.get('__clerk_created_session');
        const status = urlParams.get('__clerk_status');
        const flowType = urlParams.get('flow'); // 'registration' or 'password-reset'
        const isMigratedUser = urlParams.get('migrated') === 'true'; // Check for migrated user indicator

        if (createdSessionId && status === 'verified') {
          await setActive({ session: createdSessionId });
          
          // Set appropriate success status based on flow type
          if (flowType === 'password-reset') {
            if (isMigratedUser) {
              setVerificationStatus('migrated-user-success');
            } else {
              setVerificationStatus('password-reset-success');
            }
          } else {
            setVerificationStatus('success');
          }
          
          setTimeout(() => {
            router.push('/catalogus');
          }, 2000);
          return;
        }

        // Handle other statuses
        if (status === 'failed') {
          setVerificationStatus('error');
          setErrorMessage('Verificatie mislukt. Probeer opnieuw.');
          return;
        }

        if (status === 'expired') {
          setVerificationStatus('error');
          setErrorMessage('Verificatie link is verlopen. Vraag een nieuwe aan.');
          return;
        }

        // If no status params, check if this is a password reset flow
        if (flowType === 'password-reset') {
          // Password reset is already complete, just show success
          if (isMigratedUser) {
            setVerificationStatus('migrated-user-success');
          } else {
            setVerificationStatus('password-reset-success');
          }
          setTimeout(() => {
            router.push('/catalogus');
          }, 2000);
        } else {
          // Call handleEmailLinkVerification for email link flows
          await handleEmailLinkVerification({
            redirectUrlComplete: '/catalogus'
          });
        }

      } catch (err: any) {
        // console.error('Email link verification error:', err);
        setVerificationStatus('error');
        setErrorMessage('Verificatie mislukt. Probeer het opnieuw of neem contact op met de beheerder.');
      }
    };

    verifyEmailLink();
  }, [isLoaded, setActive, router]); // Removed signUp and handleEmailLinkVerification from dependencies

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

        {verificationStatus === 'password-reset-success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Wachtwoord succesvol gewijzigd!
            </h1>
            <p className="text-gray-600 mb-4">
              Je wachtwoord is veilig bijgewerkt. Je wordt automatisch doorgestuurd naar de dashboard.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                Je kunt nu inloggen met je nieuwe wachtwoord.
              </p>
            </div>
          </>
        )}

        {verificationStatus === 'migrated-user-success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Account succesvol gemigreerd!
            </h1>
            <p className="text-gray-600 mb-4">
              Je account is succesvol gemigreerd. Je wordt automatisch doorgestuurd naar de dashboard.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                Je kunt nu inloggen met je nieuwe wachtwoord.
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