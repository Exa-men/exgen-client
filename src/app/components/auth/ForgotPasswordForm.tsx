"use client";

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, ArrowLeft } from 'lucide-react';

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
    
    console.log('=== FORGOT PASSWORD START ===');
    console.log('Email:', email);
    console.log('Is loaded:', isLoaded);
    console.log('SignIn object:', signIn);
    
    if (!validateEmail() || !isLoaded) {
      console.log('Validation failed or not loaded');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('=== CREATING SIGN-IN ATTEMPT ===');
      
      // Create the sign-in attempt first
      const { supportedFirstFactors } = await signIn.create({
        identifier: email
      });

      console.log('=== SUPPORTED FIRST FACTORS ===');
      console.log('Supported factors:', supportedFirstFactors);

      // Find the email link factor for password reset
      const emailLinkFactor = supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_link'
      );

      console.log('=== EMAIL LINK FACTOR ===');
      console.log('Email link factor:', emailLinkFactor);

      if (!emailLinkFactor) {
        throw new Error('Email link factor not found');
      }

      // Dynamically set the host domain for dev and prod
      const protocol = window.location.protocol;
      const host = window.location.host;
      const redirectUrl = `${protocol}//${host}/reset-password`;

      console.log('=== SENDING EMAIL LINK ===');
      console.log('Email address ID:', emailLinkFactor.emailAddressId);

      // Try startEmailLinkFlow with a shorter timeout
      const emailPromise = signIn.createEmailLinkFlow().startEmailLinkFlow({
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: redirectUrl,
      });

      // Add a timeout of 5 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email link flow timeout (5s)')), 5000);
      });

      // Race between the email promise and timeout
      const result = await Promise.race([emailPromise, timeoutPromise]);

      console.log('=== EMAIL LINK RESULT ===');
      console.log('Result:', result);
      console.log('=== EMAIL LINK SENT SUCCESSFULLY ===');
      
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('=== FORGOT PASSWORD ERROR ===');
      console.error('Forgot password error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error errors:', error.errors);
      
      if (error.errors?.[0]?.code === 'form_identifier_not_found') {
        setError('Geen account gevonden met dit e-mailadres');
      } else {
        setError('Er is een fout opgetreden. Probeer het opnieuw.');
      }
    } finally {
      console.log('=== FORGOT PASSWORD FINISHED ===');
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="w-full mx-auto text-center">
        <div className="mb-6">
          <p className="text-sm sm:text-base text-gray-600">
            We hebben een 6-cijferige code verzonden naar:
          </p>
          <p className="font-medium text-gray-900 mt-1">{email}</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Controleer je inbox en voer de code in op de volgende pagina om je wachtwoord te resetten.
          </p>
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
              onClick={() => setIsEmailSent(false)}
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
          Voer je e-mailadres in en we sturen je een 6-cijferige code om je wachtwoord te resetten
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
              E-mail verzenden...
            </>
          ) : (
            'Reset code verzenden'
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