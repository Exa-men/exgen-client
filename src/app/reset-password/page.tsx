"use client";

import React, { useEffect, useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isLoaded || !signIn) return;

    // Check if we have verification parameters in the URL
    const __clerk_ticket = searchParams.get('__clerk_ticket');
    const __clerk_status = searchParams.get('__clerk_status');

    if (__clerk_status === 'verified') {
      setStatus('success');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else if (__clerk_status === 'expired') {
      setStatus('error');
      setErrorMessage('De reset link is verlopen. Vraag een nieuwe link aan.');
    } else if (__clerk_status === 'invalid') {
      setStatus('error');
      setErrorMessage('De reset link is ongeldig. Vraag een nieuwe link aan.');
    } else if (__clerk_status === 'client_mismatch') {
      setStatus('error');
      setErrorMessage('De reset link is niet geldig voor dit apparaat. Vraag een nieuwe link aan.');
    } else {
      setStatus('error');
      setErrorMessage('Er is een fout opgetreden. Probeer het opnieuw.');
    }
  }, [isLoaded, signIn, searchParams, router]);

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

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Wachtwoord succesvol gereset!
          </h1>
          <p className="text-gray-600 mb-4">
            Je wachtwoord is bijgewerkt. Je wordt automatisch doorgestuurd naar de homepage.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              Je kunt nu inloggen met je nieuwe wachtwoord.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Wachtwoord reset mislukt
          </h1>
          <p className="text-gray-600 mb-4">
            {errorMessage}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              Probeer het opnieuw of neem contact op met de support.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white py-2 px-4 rounded-lg font-medium"
          >
            Terug naar homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Wachtwoord reset verwerken...</p>
      </div>
    </div>
  );
} 