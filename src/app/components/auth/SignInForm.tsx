"use client";

import React, { useState, useRef } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface SignInFormData {
  email: string;
  password: string;
}

export const SignInForm: React.FC = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { switchModalMode, closeAuthModal } = useAuthModal();
  
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Partial<SignInFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Enhanced state for risk mitigation
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastAttemptRef = useRef<number>(0);
  
  // Rate limiting: prevent multiple submissions within 2 seconds
  const RATE_LIMIT_DELAY = 2000;
  const MAX_RETRIES = 3;

  const validateForm = (): boolean => {
    const newErrors: Partial<SignInFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail is verplicht';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Voer een geldig e-mailadres in';
    }

    if (!formData.password) {
      newErrors.password = 'Wachtwoord is verplicht';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Enhanced error detection for migrated users
  const isMigratedUserError = (error: any): boolean => {
    const errorCode = error.errors?.[0]?.code;
    const errorMessage = error.errors?.[0]?.message || '';
    
    // Primary check: specific error code for migrated users
    if (errorCode === 'strategy_for_user_invalid') {
      return true;
    }
    
    // Fallback check: error message patterns for migrated users
    return (
      errorMessage.includes('verification strategy is not valid') ||
      errorMessage.includes('strategy is not valid for this account')
    );
  };

  // Enhanced migrated user detection with validation
  const validateMigratedUser = async (email: string): Promise<boolean> => {
    try {
      // Optional: Add backend validation here
      // const response = await fetch(`/api/validate-user?email=${encodeURIComponent(email)}`);
      // const data = await response.json();
      // return data.isMigratedUser;
      
      // Since we're now using specific error detection, we can trust the error-based detection
      return true;
    } catch (error) {
      console.error('Error validating migrated user:', error);
      // Fallback to error-based detection
      return true;
    }
  };

  // Comprehensive error handler for Clerk errors
  const handleClerkError = (error: any) => {
    // Check for direct error code first (like session_exists)
    if (error.code === 'session_exists') {
      return {
        type: 'already_signed_in',
        message: 'Je bent al ingelogd. Ververs de pagina.',
        action: 'redirect'
      };
    }
    
    // Check for errors array (validation errors)
    const errorCode = error.errors?.[0]?.code;
    if (errorCode) {
      switch (errorCode) {
        case 'form_identifier_not_verified':
          return { type: 'not_verified', message: 'E-mailadres is niet geverifieerd. Controleer je inbox.' };
        case 'form_identifier_not_found':
          return { type: 'user_not_found', message: 'Geen account gevonden met dit e-mailadres.' };
        case 'form_password_incorrect':
          return { type: 'wrong_password', message: 'Onjuist wachtwoord. Probeer opnieuw.' };
        case 'session_exists':
          return {
            type: 'already_signed_in',
            message: 'Je bent al ingelogd. Ververs de pagina.',
            action: 'redirect'
          };
        default:
          return { type: 'unknown', message: 'Er is een fout opgetreden. Probeer het opnieuw.' };
      }
    }
    
    // Fallback for unknown errors
    return { type: 'unknown', message: 'Er is een fout opgetreden. Probeer het opnieuw.' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !isLoaded) return;

    // Rate limiting protection
    const now = Date.now();
    if (now - lastAttemptRef.current < RATE_LIMIT_DELAY) {
      setErrors({ email: 'Te veel pogingen. Wacht even en probeer opnieuw.' });
      return;
    }
    
    if (isProcessing) return; // Prevent multiple submissions
    
    setIsLoading(true);
    setIsProcessing(true);
    lastAttemptRef.current = now;
    
    try {
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password
      });

      if (result.status === 'complete') {
        // Use setActive to properly activate the session
        if (setActive && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        
        closeAuthModal();
        window.location.href = '/catalogus';
      } else if (result.status === 'needs_first_factor') {
        // Handle first factor requirement (if needed in the future)
        console.log('First factor required');
        setErrors({ email: 'Extra verificatie vereist.' });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Enhanced migrated user detection
      if (isMigratedUserError(error)) {
        const isValidMigratedUser = await validateMigratedUser(formData.email);
        
        if (isValidMigratedUser) {
          await handleMigratedUserDetection(formData.email, error.errors?.[0]?.code || 'migrated_user');
          return;
        }
      }
      
      // Use comprehensive error handler
      const errorResult = handleClerkError(error);
      
      // Handle the error based on type
      switch (errorResult.type) {
        case 'already_signed_in':
          setErrors({ email: errorResult.message });
          if (errorResult.action === 'redirect') {
            setTimeout(() => {
              closeAuthModal();
              window.location.reload();
            }, 2000);
          }
          break;
        case 'wrong_password':
          setRetryCount(prev => prev + 1);
          if (retryCount >= MAX_RETRIES) {
            setErrors({ password: 'Te veel foutieve pogingen. Probeer later opnieuw of reset je wachtwoord.' });
          } else {
            setErrors({ password: errorResult.message });
          }
          break;
        case 'not_verified':
        case 'user_not_found':
          setErrors({ email: errorResult.message });
          break;
        default:
          setErrors({ email: errorResult.message });
      }
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleMigratedUserDetection = async (email: string, errorCode: string) => {
    try {
      console.log('Checking for migrated user:', email, 'Error code:', errorCode);
      
      // Show migration message
      setErrors({ 
        password: 'Je account is gemigreerd. Je moet je wachtwoord opnieuw instellen.' 
      });
      
      // Add migrated user indicator and email to URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('migrated', 'true');
      currentUrl.searchParams.set('email', email); // Add email to URL
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Switch to forgot password modal (fresh SignIn context)
      switchModalMode('forgot-password');
      
      console.log('Migrated user detected, switched to password reset flow with email:', email);
      
    } catch (resetError) {
      console.error('Error handling migrated user:', resetError);
      setErrors({ 
        password: 'Er is een fout opgetreden bij het opnieuw instellen van je wachtwoord.' 
      });
    }
  };

  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-6">
        <p className="text-sm sm:text-base text-gray-600">Log in op je account</p>
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
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            placeholder="Voer je e-mailadres in"
            disabled={isLoading || isProcessing}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Wachtwoord
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              placeholder="Voer je wachtwoord in"
              disabled={isLoading || isProcessing}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={isLoading || isProcessing}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={() => switchModalMode('forgot-password')}
            className="text-sm text-examen-cyan hover:text-examen-cyan-600"
            disabled={isLoading || isProcessing}
          >
            Wachtwoord herstellen?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-examen-cyan hover:bg-examen-cyan-600 text-white"
          disabled={isLoading || isProcessing}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inloggen...
            </>
          ) : (
            'Inloggen'
          )}
        </Button>
      </form>

      {/* Switch to Sign Up */}
      <div className="text-center mt-6">
        <p className="text-gray-600">
          Nog geen account?{' '}
          <button
            type="button"
            onClick={() => switchModalMode('sign-up')}
            className="text-examen-cyan hover:text-examen-cyan-600 font-medium"
            disabled={isLoading || isProcessing}
          >
            Account aanmaken
          </button>
        </p>
      </div>
    </div>
  );
}; 