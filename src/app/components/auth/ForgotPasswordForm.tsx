"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSignIn, useClerk } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { useApi } from '../../../hooks/use-api';
import { Loader2, ArrowLeft, CheckCircle, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { validateEmail, getEmailValidationErrorMessage } from '../../../lib/email-validation';
import { useSearchParams } from 'next/navigation';

export const ForgotPasswordForm: React.FC = () => {
  const { signIn, isLoaded } = useSignIn();
  const { client } = useClerk();
  const { switchModalMode } = useAuthModal();
  const { clearTokenCache } = useApi();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessingReset, setIsProcessingReset] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isMigratedUser, setIsMigratedUser] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Check if user is a migrated user
  useEffect(() => {
    const migrated = searchParams.get('migrated');
    const migratedEmail = searchParams.get('email');
    
    if (migrated === 'true' && migratedEmail) {
      setIsMigratedUser(true);
      setEmail(migratedEmail);
    }
  }, [searchParams]);

  const validateEmailForm = (): boolean => {
    if (!email.trim()) {
      setError('E-mail is verplicht');
      return false;
    }
    if (!validateEmail(email)) {
      setError(getEmailValidationErrorMessage());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm() || !isLoaded) return;

    setIsLoading(true);
    
    try {
      // Use Clerk's reset password email code strategy for password reset
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      // Check for errors array (validation errors)
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
        // Password reset successful - show processing state
        console.log('✅ Password reset completed, waiting for session establishment...');
        setIsProcessingReset(true);
        
        // Clear any cached tokens to ensure fresh authentication
        clearTokenCache();
        
        // Start countdown and redirect after 3 seconds
        let remainingTime = 3;
        setCountdown(remainingTime);
        
        countdownIntervalRef.current = setInterval(() => {
          remainingTime -= 1;
          setCountdown(remainingTime);
          
          if (remainingTime <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            console.log('🔄 Redirecting to catalogus...');
            window.location.href = '/catalogus';
          }
        }, 1000);
      } else if (result.status === 'needs_second_factor') {
        setError('Tweefactor authenticatie is vereist, maar wordt niet ondersteund in deze interface');
      } else {
        setError('Onverwachte status: ' + result.status);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Check for errors array (validation errors)
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

  if (isProcessingReset) {
    return (
      <div className="w-full mx-auto text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Wachtwoord succesvol gereset!
          </h2>
          <p className="text-sm text-gray-600">
            Je wachtwoord is bijgewerkt. We stellen je sessie in...
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            <p className="text-green-800 text-sm font-medium">
              Sessie wordt ingesteld, even geduld...
            </p>
          </div>
          <div className="mt-3 text-center">
            <p className="text-green-700 text-sm">
              Doorsturen over <span className="font-bold">{countdown}</span> seconde{countdown !== 1 ? 'n' : ''}...
            </p>
            <div className="mt-2 w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Je wordt automatisch doorgestuurd naar de catalogus.</p>
        </div>
      </div>
    );
  }

  if (isEmailSent) {
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
                {isMigratedUser 
                  ? 'Voer de 6-cijferige code in om je wachtwoord opnieuw in te stellen en toegang te krijgen tot je gemigreerde account.'
                  : 'Voer de 6-cijferige code in die je per e-mail ontvangt om je wachtwoord te resetten. De code is 1 uur geldig.'
                }
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
            onClick={() => {
              setIsEmailSent(false);
              setError('');
              setCode('');
              setPassword('');
              setConfirmPassword('');
            }}
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
            {isMigratedUser ? 'Terug naar inloggen' : 'Terug naar inloggen'}
          </Button>
          
          <p className="text-sm text-gray-600 text-center">
            Geen code ontvangen?{' '}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="text-examen-cyan hover:text-examen-cyan-600 font-medium"
            >
              Opnieuw verzenden
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
          {isMigratedUser 
            ? 'Wachtwoord herstellen'
            : 'Voer je e-mailadres in en we sturen je een link om je wachtwoord te resetten'
          }
        </p>
      </div>

      {isMigratedUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-blue-800 text-sm font-medium mb-1">
                Password Reset Vereist
              </p>
              <p className="text-blue-700 text-sm">
                Hoi! We hebben ons platform vernieuwd en je account gemigreerd. Je moet je wachtwoord opnieuw instellen om in te loggen.
              </p>
            </div>
          </div>
        </div>
      )}

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
            disabled={isLoading || isMigratedUser}
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
            isMigratedUser ? 'Verstuur Reset Link' : 'Reset link verzenden'
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
            {isMigratedUser ? 'Probeer opnieuw in te loggen' : 'Terug naar inloggen'}
          </Button>
        </div>
    </div>
  );
};