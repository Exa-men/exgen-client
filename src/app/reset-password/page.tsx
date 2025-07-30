"use client";

import React, { useState } from 'react';
import { useSignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const { user } = useUser();
  const router = useRouter();
  
  // Debug logging on component mount
  React.useEffect(() => {
    console.log('=== RESET PASSWORD PAGE MOUNTED ===');
    console.log('Is loaded:', isLoaded);
    console.log('SignIn object:', signIn);
    console.log('SignIn status:', signIn?.status);
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    console.log('User email:', user?.primaryEmailAddress?.emailAddress);
    console.log('User email verified:', user?.primaryEmailAddress?.verification?.status);
  }, [isLoaded, signIn, user]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    if (!password) {
      setErrorMessage('Wachtwoord is verplicht');
      return false;
    }
    if (password.length < 8) {
      setErrorMessage('Wachtwoord moet minimaal 8 karakters bevatten');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Wachtwoorden komen niet overeen');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== PASSWORD RESET SUBMIT START ===');
    console.log('Is loaded:', isLoaded);
    console.log('SignIn object:', signIn);
    console.log('SignIn status:', signIn?.status);
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    console.log('User email:', user?.primaryEmailAddress?.emailAddress);
    
    if (!validateForm() || !isLoaded) {
      console.log('Form validation failed or not loaded');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('=== CHECKING AUTHENTICATION STATUS ===');
      console.log('SignIn status:', signIn?.status);
      console.log('User authenticated:', !!user);
      console.log('User email verified:', user?.primaryEmailAddress?.verification?.status);
      
      // For magic link flow, the user should already be authenticated
      // Check if user is authenticated (this is the correct way for magic links)
      if (user && user.primaryEmailAddress?.verification?.status === 'verified') {
        console.log('=== USER AUTHENTICATED - SUCCESS ===');
        // User is authenticated via magic link and email is verified
        // For now, we'll redirect them to the platform
        // They can set their password later in their account settings
        setStatus('success');
        // Redirect to platform after a short delay
        setTimeout(() => {
          router.push('/catalogus');
        }, 2000);
      } else {
        console.log('=== USER NOT AUTHENTICATED - ERROR ===');
        console.log('User authenticated:', !!user);
        console.log('Email verification status:', user?.primaryEmailAddress?.verification?.status);
        setStatus('error');
        setErrorMessage('Je bent niet geverifieerd. Controleer je e-mail en klik op de link.');
      }
    } catch (error: any) {
      console.error('=== PASSWORD RESET ERROR ===');
      console.error('Reset password error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      setStatus('error');
      setErrorMessage('Er is een fout opgetreden tijdens het resetten van je wachtwoord.');
    } finally {
      console.log('=== PASSWORD RESET SUBMIT END ===');
      setIsLoading(false);
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

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Welkom bij het nieuwe platform!
          </h1>
          <p className="text-gray-600 mb-4">
            Je account is succesvol gemigreerd. Je wordt automatisch doorgestuurd naar het platform.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              Je bent nu ingelogd en kunt het platform gebruiken.
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
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
          >
            Terug naar homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Nieuw wachtwoord instellen
          </h1>
          <p className="text-gray-600 text-sm">
            Stel je nieuwe wachtwoord in voor je account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Nieuw wachtwoord
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                placeholder="Voer je nieuwe wachtwoord in"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Bevestig wachtwoord
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                placeholder="Bevestig je nieuwe wachtwoord"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wachtwoord bijwerken...
              </>
            ) : (
              'Wachtwoord bijwerken'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 