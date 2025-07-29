"use client";

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    if (!code) {
      setErrorMessage('Code is verplicht');
      return false;
    }
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
    
    if (!validateForm() || !isLoaded) return;

    setIsLoading(true);
    
    try {
      // Attempt to reset the password
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code,
        password: password,
      });

      if (result.status === 'complete') {
        setStatus('success');
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setStatus('error');
        setErrorMessage('Wachtwoord reset mislukt. Probeer het opnieuw.');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setStatus('error');
      setErrorMessage('Er is een fout opgetreden tijdens het resetten van je wachtwoord.');
    } finally {
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
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Terug naar homepage
          </button>
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
            Voer de 6-cijferige code uit je e-mail in en stel je nieuwe wachtwoord in
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code */}
          <div>
            <Label htmlFor="code" className="text-sm font-medium text-gray-700">
              6-cijferige code
            </Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Voer de 6-cijferige code in"
              maxLength={6}
              className="text-center text-lg tracking-widest"
              disabled={isLoading}
            />
          </div>

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
            className="w-full"
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