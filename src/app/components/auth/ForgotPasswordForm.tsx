"use client";

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, ArrowLeft, CheckCircle, Mail } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const { signIn, isLoaded } = useSignIn();
  const { switchModalMode } = useAuthModal();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('E-mail is verplicht');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Voer een geldig e-mailadres in');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail() || !isLoaded) return;

    setIsLoading(true);
    
    try {
      // Use Clerk's magic link strategy for password reset
      await signIn.create({
        strategy: 'email_link',
        identifier: email,
      });
      
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Simplified error handling using Clerk's error codes
      const errorCode = error.errors?.[0]?.code;
      switch (errorCode) {
        case 'form_identifier_not_found':
          setError('Geen account gevonden met dit e-mailadres');
          break;
        case 'form_identifier_not_verified':
          setError('E-mailadres is niet geverifieerd. Controleer je inbox.');
          break;
        default:
          setError('Er is een fout opgetreden. Probeer het opnieuw.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="w-full mx-auto text-center">
        <div className="mb-6">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            We hebben een wachtwoord reset link verzonden naar:
          </p>
          <p className="font-medium text-gray-900 mt-1">{email}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-blue-800 text-sm font-medium">
                Controleer je inbox
              </p>
              <p className="text-blue-700 text-sm mt-1">
                Klik op de link in de e-mail om je wachtwoord te resetten. 
                De link is 1 uur geldig.
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
          
          <p className="text-sm text-gray-600">
            Geen e-mail ontvangen?{' '}
            <button
              onClick={() => {
                setIsEmailSent(false);
                setError('');
              }}
              className="text-examen-cyan hover:text-examen-cyan-600 font-medium"
            >
              Probeer opnieuw
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-6">
        <p className="text-sm sm:text-base text-gray-600">
          Voer je e-mailadres in en we sturen je een link om je wachtwoord te resetten
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            className={error ? 'border-red-500' : ''}
            placeholder="Voer je e-mailadres in"
            disabled={isLoading}
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reset link verzenden...
            </>
          ) : (
            'Reset link verzenden'
          )}
        </Button>
      </form>

      {/* Back to Sign In */}
      <div className="text-center mt-6">
        <Button
          onClick={() => switchModalMode('sign-in')}
          variant="outline"
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar inloggen
        </Button>
      </div>
    </div>
  );
};