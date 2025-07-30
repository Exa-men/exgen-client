"use client";

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { MigrationModal } from './MigrationModal';

interface SignInFormData {
  email: string;
  password: string;
}

export const SignInForm: React.FC = () => {
  const { signIn, isLoaded } = useSignIn();
  const { switchModalMode, closeAuthModal } = useAuthModal();
  
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Partial<SignInFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migratedUserEmail, setMigratedUserEmail] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !isLoaded) return;

    setIsLoading(true);
    
    try {
      // First, check if this is a migrated user
      const migrationCheck = await fetch('/api/v1/auth/check-migrated-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      if (migrationCheck.ok) {
        const migrationData = await migrationCheck.json();
        
        if (migrationData.is_migrated && migrationData.requires_password_reset) {
          // Show migration modal instead of regular sign-in
          setMigratedUserEmail(formData.email);
          setMigrationModalOpen(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Continue with normal sign-in flow
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password
      });

      if (result.status === 'complete') {
        // Sign in successful
        closeAuthModal();
        // Optionally refresh the page or redirect
        window.location.reload();
      } else if (result.status === 'needs_first_factor') {
        // Handle 2FA if needed
        console.log('2FA required');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific Clerk errors
      if (error.errors?.[0]?.code === 'form_identifier_not_found') {
        setErrors({ email: 'Geen account gevonden met dit e-mailadres' });
      } else if (error.errors?.[0]?.code === 'form_password_incorrect') {
        setErrors({ password: 'Onjuist wachtwoord' });
      } else if (error.errors?.[0]?.code === 'form_identifier_not_verified') {
        setErrors({ email: 'E-mailadres is niet geverifieerd. Controleer je inbox.' });
      } else {
        setErrors({ email: 'Er is een fout opgetreden. Probeer het opnieuw.' });
      }
    } finally {
      setIsLoading(false);
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
            disabled={isLoading}
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
            disabled={isLoading}
          >
            Wachtwoord vergeten?
          </button>
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
            disabled={isLoading}
          >
            Account aanmaken
          </button>
        </p>
      </div>

      {/* Migration Modal */}
      {migrationModalOpen && (
        <MigrationModal
          email={migratedUserEmail}
          onClose={() => {
            setMigrationModalOpen(false);
            setMigratedUserEmail('');
            closeAuthModal();
          }}
        />
      )}
    </div>
  );
}; 