"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

interface ClerkErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ClerkErrorBoundary({ 
  children, 
  fallback
}: ClerkErrorBoundaryProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [loadStartTime] = useState(performance.now());

  // Default fallback with router access
  const defaultFallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentication Error
        </h2>
        <p className="text-gray-600 mb-4">
          There was an issue with authentication. Please refresh the page or try signing in again.
        </p>
        <Button 
          onClick={() => router.refresh()} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </div>
    </div>
  );

  // Use provided fallback or default
  const errorFallback = fallback || defaultFallback;

  // Debug logging
  console.log('🔐 ClerkErrorBoundary state:', { isLoaded, isSignedIn, hasError });

  useEffect(() => {
    // Log Clerk performance metrics
    if (isLoaded) {
      const loadTime = performance.now() - loadStartTime;
      console.log('🔐 Clerk loaded in:', loadTime.toFixed(0), 'ms');
      
      // Set error if Clerk takes too long to load
      if (loadTime > 5000) {
        console.warn('⚠️ Clerk took longer than 5 seconds to load');
      }
    }
  }, [isLoaded, loadStartTime]);

  useEffect(() => {
    // Handle Clerk errors
    const handleClerkError = (error: any) => {
      console.error('🔐 Clerk error:', error);
      setHasError(true);
    };

    // Listen for Clerk errors
    window.addEventListener('clerk-error', handleClerkError);
    
    return () => {
      window.removeEventListener('clerk-error', handleClerkError);
    };
  }, []);

  // Don't show error boundary for unauthenticated users (like homepage visitors)
  // Only show it for authenticated users who experience actual errors
  if (isLoaded && !isSignedIn) {
    // Allow unauthenticated users to see the content (like homepage)
    console.log('✅ Clerk loaded, user not signed in - showing content');
    return <>{children}</>;
  }

  if (hasError) {
    console.log('❌ Clerk error detected - showing error boundary');
    return errorFallback;
  }

  // For unauthenticated users, show content immediately without waiting for Clerk to load
  // This prevents the "Initializing authentication..." screen for visitors
  if (!isLoaded && !isSignedIn) {
    console.log('✅ Clerk not loaded yet, but user not signed in - showing content immediately');
    return <>{children}</>;
  }

  // Only show loading state if Clerk is still initializing AND user might be signed in
  // This should be a very brief moment for authenticated users
  if (!isLoaded) {
    console.log('⏳ Clerk still loading for potentially authenticated user...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // For authenticated users or unauthenticated users on public pages, show content normally
  console.log('✅ Clerk loaded successfully - showing content');
  return <>{children}</>;
}
