"use client";

import React, { useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { Loader2 } from 'lucide-react';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  department: string;
  password: string;
}

export const SignUpForm: React.FC = () => {
  const { signUp, isLoaded } = useSignUp();
  const { switchModalMode } = useAuthModal();
  
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    schoolName: '',
    department: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpFormData> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Voornaam is verplicht';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Achternaam is verplicht';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail is verplicht';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Voer een geldig e-mailadres in';
    }
    
    if (!formData.password) {
      newErrors.password = 'Wachtwoord is verplicht';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Wachtwoord moet minimaal 8 karakters bevatten';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClerkError = (error: any) => {
    const errorCode = error.errors?.[0]?.code;
    switch (errorCode) {
      case 'form_identifier_exists':
        setErrors({ email: 'Dit e-mailadres is al in gebruik' });
        break;
      case 'form_password_pwned':
        setErrors({ password: 'Dit wachtwoord is te zwak. Kies een sterker wachtwoord' });
        break;
      case 'form_password_validation_failed':
        setErrors({ password: 'Wachtwoord voldoet niet aan de vereisten' });
        break;
      default:
        setErrors({ email: 'Er is een fout opgetreden. Probeer het opnieuw.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== SIGN-UP PROCESS START ===');
    console.log('Form data:', formData);
    console.log('Is loaded:', isLoaded);
    console.log('SignUp object:', signUp);
    
    if (!validateForm() || !isLoaded) {
      console.log('Validation failed or not loaded, returning early');
      return;
    }

    setIsLoading(true);
    console.log('Set loading to true');
    
    try {
      console.log('=== CREATING SIGN-UP ===');
      console.log('About to call signUp.create with:', {
        emailAddress: formData.email,
        password: '[HIDDEN]',
        firstName: formData.firstName,
        lastName: formData.lastName,
        unsafeMetadata: {
          school_name: formData.schoolName || null,
          department: formData.department || null
        }
      });
      
      // Use Clerk's simplified API
      const signUpResult = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        unsafeMetadata: {
          school_name: formData.schoolName || null,
          department: formData.department || null
        }
      });
      
      console.log('=== SIGN-UP CREATE RESULT ===');
      console.log('Full result:', signUpResult);
      console.log('Status:', signUpResult.status);
      console.log('Verifications:', signUpResult.verifications);
      console.log('Required fields:', signUpResult.requiredFields);
      console.log('Optional fields:', signUpResult.optionalFields);
      console.log('ID:', signUpResult.id);
      
      // Check if email verification is needed
      if (signUpResult.verifications?.emailAddress) {
        console.log('=== EMAIL VERIFICATION DETAILS ===');
        console.log('Email verification status:', signUpResult.verifications.emailAddress.status);
        console.log('Email verification strategy:', signUpResult.verifications.emailAddress.strategy);
        console.log('Email verification error:', signUpResult.verifications.emailAddress.error);
      }
      
      // Check if we need to prepare email verification
      if (signUpResult.status === 'missing_requirements') {
        console.log('=== MISSING REQUIREMENTS DETECTED ===');
        console.log('Required fields:', signUpResult.requiredFields);
        console.log('Optional fields:', signUpResult.optionalFields);
        
        // Check if email verification is required
        if (signUpResult.requiredFields?.includes('email_address')) {
          console.log('Email verification is required, preparing...');
          try {
            const verificationResult = await signUp.prepareEmailAddressVerification({
              strategy: 'email_link',
              redirectUrl: `${window.location.origin}/sign-up/verify`
            });
            console.log('=== EMAIL VERIFICATION PREPARED ===');
            console.log('Verification result:', verificationResult);
            console.log('Verification status:', verificationResult.status);
          } catch (verificationError) {
            console.error('=== EMAIL VERIFICATION ERROR ===');
            console.error('Verification error:', verificationError);
          }
        }
      }
      
      console.log('=== SWITCHING TO VERIFICATION SENT ===');
      // Clerk handles email verification automatically
      switchModalMode('verification-sent');
      console.log('Modal mode switched to verification-sent');
      
    } catch (error: any) {
      console.error('=== SIGN-UP ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error errors:', error.errors);
      console.error('Error code:', error.errors?.[0]?.code);
      console.error('Error stack:', error.stack);
      handleClerkError(error);
    } finally {
      console.log('=== SIGN-UP PROCESS END ===');
      setIsLoading(false);
      console.log('Set loading to false');
    }
  };

  return (
    <div className="w-full mx-auto">
      <div className="text-center mb-6">
        <p className="text-sm sm:text-base text-gray-600">Maak een account aan om toegang te krijgen</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            Voornaam *
          </Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className={errors.firstName ? 'border-red-500' : ''}
            placeholder="Voer je voornaam in"
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Achternaam *
          </Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className={errors.lastName ? 'border-red-500' : ''}
            placeholder="Voer je achternaam in"
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            E-mail *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            placeholder="voer je e-mailadres in"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* School Name */}
        <div>
          <Label htmlFor="schoolName" className="text-sm font-medium text-gray-700">
            Onderwijsinstelling
          </Label>
          <Input
            id="schoolName"
            type="text"
            value={formData.schoolName}
            onChange={(e) => handleInputChange('schoolName', e.target.value)}
            placeholder="Voer je onderwijsinstelling in (optioneel)"
            disabled={isLoading}
          />
        </div>

        {/* Department */}
        <div>
          <Label htmlFor="department" className="text-sm font-medium text-gray-700">
            Afdeling
          </Label>
          <Input
            id="department"
            type="text"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            placeholder="Voer je afdeling in (optioneel)"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Wachtwoord *
          </Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              placeholder="Kies een wachtwoord"
              disabled={isLoading}
            />
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
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
              Account aanmaken...
            </>
          ) : (
            'Account aanmaken'
          )}
        </Button>
      </form>

      {/* Switch to Sign In */}
      <div className="text-center mt-6">
        <p className="text-gray-600">
          Heb je al een account?{' '}
          <button
            type="button"
            onClick={() => switchModalMode('sign-in')}
            className="text-examen-cyan hover:text-examen-cyan-600 font-medium"
            disabled={isLoading}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}; 