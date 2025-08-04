"use client";

import React, { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, Eye, EyeOff, Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';

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
  
  // Migration context
  const [isMigratedUser, setIsMigratedUser] = useState(false);

  // Read URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const migratedEmail = urlParams.get('email');
    const isMigrated = urlParams.get('migrated') === 'true';
    
    // Set migration context
    setIsMigratedUser(isMigrated);
    
    // Pre-fill email if available and not already set
    if (migratedEmail && !email) {
      setEmail(migratedEmail);
    }
  }, []);

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
        // Check if this is a migrated user password reset
        const urlParams = new URLSearchParams(window.location.search);
        const isMigrated = urlParams.get('migrated') === 'true';
        
        // Password reset successful - redirect to verification page with appropriate parameters
        const redirectUrl = isMigrated 
          ? '/sign-up/verify?flow=password-reset&migrated=true'
          : '/sign-up/verify?flow=password-reset';
        
        window.location.href = redirectUrl;
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
  };

  const handleResendCode = async () => {
    if (!signIn) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      
      setError('Nieuwe code verzonden naar je e-mailadres.');
    } catch (error: any) {
      console.error('Resend code error:', error);
      setError('Er is een fout opgetreden bij het verzenden van de code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render different UI based on migration context
  if (modalState === 'email') {
    return (
      <div className="w-full mx-auto">
        <div className="text-center mb-6">
          {isMigratedUser ? (
            <>
              <div className="flex justify-center mb-4">
                <RefreshCw className="h-8 w-8 text-examen-cyan" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Password Reset Vereist
              </h2>
              <p className="text-sm text-gray-600">
                Hoi! We hebben ons platform vernieuwd en je account gemigreerd. 
                Je moet je wachtwoord opnieuw instellen om in te loggen.
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <Mail className="h-8 w-8 text-examen-cyan" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Wachtwoord Herstellen
              </h2>
              <p className="text-sm text-gray-600">
                Voer je e-mailadres in om je wachtwoord te resetten.
              </p>
            </>
          )}
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Voer je e-mailadres in"
              disabled={isLoading}
            />
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
                Versturen...
              </>
            ) : (
              'Verstuur Reset Link'
            )}
          </Button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Back to Sign In */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => switchModalMode('sign-in')}
            className="text-sm text-examen-cyan hover:text-examen-cyan-600"
            disabled={isLoading}
          >
            Terug naar inloggen
          </button>
        </div>
      </div>
    );
  }

  // Code input state (unchanged)
  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Code Verificatie
        </h2>
        <p className="text-sm text-gray-600">
          We hebben een 6-cijferige code naar {email} gestuurd.
        </p>
      </div>

      <form onSubmit={handleCodeSubmit} className="space-y-4">
        {/* Code */}
        <div>
          <Label htmlFor="code" className="text-sm font-medium text-gray-700">
            Verificatie Code
          </Label>
          <Input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            disabled={isLoading}
          />
        </div>

        {/* New Password */}
        <div>
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Nieuw Wachtwoord
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 8 karakters"
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
            Bevestig Wachtwoord
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal je wachtwoord"
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wachtwoord Wijzigen...
            </>
          ) : (
            'Wachtwoord Wijzigen'
          )}
        </Button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={handleBackToEmail}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Terug
        </button>
        
        <button
          type="button"
          onClick={handleResendCode}
          className="text-sm text-examen-cyan hover:text-examen-cyan-600"
          disabled={isLoading}
        >
          Code opnieuw versturen
        </button>
      </div>
    </div>
  );
};