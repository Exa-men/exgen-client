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
    // Only show banner when we're certain the user has no credits
    // Add a small delay to prevent micro-flashes
    const timer = setTimeout(() => {
      if (userLoaded && !loading && credits === 0) {
        setShowBanner(true);
      } else {
        setShowBanner(false);
      }
    }, 100); // Small delay to ensure stable state

    return () => clearTimeout(timer);
  }, [userLoaded, loading, credits]);

  // Hide banner if welcome banner is being shown
  if (!showBanner || hideWhenWelcomeBannerShown) {
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