"use client";

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, Eye, EyeOff, Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const { signIn, isLoaded } = useSignIn();
  const { switchModalMode } = useAuthModal();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Modal state: 'email' or 'code'
  const [modalState, setModalState] = useState<'email' | 'code'>('email');

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

  const validateCodeForm = (): boolean => {
    if (!password || !confirmPassword || !code) {
      setError('Vul alle velden in');
      return false;
    }
    
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 karakters lang zijn');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return false;
    }
    
    if (code.length !== 6) {
      setError('Voer de 6-cijferige code in');
      return false;
    }
    
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail() || !isLoaded) return;

    setIsLoading(true);
    setError('');
    
    try {
      // Send password reset code
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      
      // Switch to code input state
      setModalState('code');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
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

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCodeForm() || !signIn) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });
      
      if (result.status === 'complete') {
        // Password reset successful - redirect to catalogus
        window.location.href = '/catalogus';
      } else if (result.status === 'needs_second_factor') {
        setError('Tweefactor authenticatie is vereist, maar wordt niet ondersteund in deze interface');
      } else {
        setError('Onverwachte status: ' + result.status);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      const errorCode = error.errors?.[0]?.code;
      switch (errorCode) {
        case 'form_code_incorrect':
          setError('De code is onjuist. Controleer je e-mail en probeer opnieuw.');
          break;
        case 'form_code_expired':
          setError('De code is verlopen. Vraag een nieuwe code aan.');
          break;
        case 'form_password_pwned':
          setError('Dit wachtwoord is te zwak. Kies een sterker wachtwoord.');
          break;
        default:
          setError('Er is een fout opgetreden. Probeer het opnieuw.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setModalState('email');
    setError('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      
      setError('');
      // You could show a success message here
    } catch (error: any) {
      console.error('Resend code error:', error);
      setError('Er is een fout opgetreden bij het opnieuw verzenden van de code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email Input State
  if (modalState === 'email') {
    return (
      <div className="w-full mx-auto">
        <div className="text-center mb-6">
          <p className="text-sm sm:text-base text-gray-600">
            Voer je e-mailadres in en we sturen je een 6-cijferige code om je wachtwoord te resetten
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                Code verzenden...
              </>
            ) : (
              'Code verzenden'
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
  }

  // Code + Password Input State
  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          We hebben een 6-cijferige code verzonden naar:
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
              Voer de 6-cijferige code in die je per e-mail ontvangt om je wachtwoord te resetten. 
              De code is 1 uur geldig.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCodeSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <Label htmlFor="code" className="text-sm font-medium text-gray-700">
            6-cijferige code
          </Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError('');
            }}
            placeholder="123456"
            maxLength={6}
            className={error ? 'border-red-500' : ''}
            disabled={isLoading}
            required
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Nieuw wachtwoord
          </Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Minimaal 8 karakters"
              className={`pr-10 ${error ? 'border-red-500' : ''}`}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Bevestig nieuw wachtwoord
          </Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Herhaal je wachtwoord"
              className={`pr-10 ${error ? 'border-red-500' : ''}`}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wachtwoord resetten...
            </>
          ) : (
            'Wachtwoord resetten'
          )}
        </Button>
      </form>

      {/* Action Buttons */}
      <div className="space-y-3 mt-6">
        <Button
          onClick={handleBackToEmail}
          variant="outline"
          className="w-full"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ander e-mailadres gebruiken
        </Button>
        
        <Button
          onClick={() => switchModalMode('sign-in')}
          variant="outline"
          className="w-full"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar inloggen
        </Button>
        
        <p className="text-sm text-gray-600 text-center">
          Geen code ontvangen?{' '}
          <button
            onClick={handleResendCode}
            disabled={isLoading}
            className="text-examen-cyan hover:text-examen-cyan-600 font-medium"
          >
            Opnieuw verzenden
          </button>
        </p>
      </div>
    </div>
  );
};