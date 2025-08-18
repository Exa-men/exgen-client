"use client"

import React, { useState, useEffect } from 'react';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { useCredits } from '../contexts/CreditContext';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { cn } from '../../lib/utils';

interface CreditBannerProps {
  onOrderCredits: () => void;
  className?: string;
  hideWhenWelcomeBannerShown?: boolean;
}

const CreditBanner: React.FC<CreditBannerProps> = ({ 
  onOrderCredits, 
  className,
  hideWhenWelcomeBannerShown = false
}) => {
  const { credits, loading } = useCredits();
  const { isLoaded: userLoaded } = useUser();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show banner when we're absolutely certain the user has no credits
    // Wait for both user to be loaded AND credits to be loaded
    if (userLoaded && !loading) {
      // Add a longer delay to ensure stable state and prevent micro-flashes
      const timer = setTimeout(() => {
        // Only show if credits are exactly 0 (not undefined/null)
        // And ensure we've waited long enough for any async operations to complete
        if (credits === 0) {
          console.log('🚨 CreditBanner: Showing banner - user has 0 credits');
          setShowBanner(true);
        } else {
          console.log('✅ CreditBanner: Hiding banner - user has credits:', credits);
          setShowBanner(false);
        }
      }, 500); // Increased delay to ensure stable state

      return () => clearTimeout(timer);
    } else {
      // Hide banner while loading or user not loaded
      console.log('⏳ CreditBanner: Hiding banner - loading:', loading, 'userLoaded:', userLoaded, 'credits:', credits);
      setShowBanner(false);
    }
  }, [userLoaded, loading, credits]);

  // Hide banner if welcome banner is being shown
  if (!showBanner || hideWhenWelcomeBannerShown) {
    return null;
  }

  // Additional safety check - don't render anything if still loading
  if (loading || !userLoaded) {
    return null;
  }

  // Don't render if credits is undefined/null (still loading)
  if (credits === undefined || credits === null) {
    return null;
  }

  // Don't render if we're in any loading state
  if (loading) {
    return null;
  }

  // Final safety check - ensure we have valid credit data
  if (typeof credits !== 'number') {
    console.warn('⚠️ CreditBanner: Invalid credits value:', credits);
    return null;
  }

  return (
    <div className={cn(
      "bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Geen credits beschikbaar
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Je hebt momenteel geen credits om examens te kopen. Bestel credits om door te gaan.
            </p>
          </div>
        </div>
        <Button
          onClick={onOrderCredits}
          className="bg-amber-600 hover:bg-amber-700 text-white"
          size="sm"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Credits Bestellen
        </Button>
      </div>
    </div>
  );
};

export default CreditBanner; 