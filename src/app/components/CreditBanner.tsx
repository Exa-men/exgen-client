"use client"

import React from 'react';
import { AlertCircle, ShoppingCart } from 'lucide-react';
import { useCredits } from '../contexts/CreditContext';
import { Button } from './ui/button';
import { cn } from '../../lib/utils';

interface CreditBannerProps {
  onOrderCredits: () => void;
  className?: string;
}

const CreditBanner: React.FC<CreditBannerProps> = ({ 
  onOrderCredits, 
  className 
}) => {
  const { credits, loading } = useCredits();

  // Don't show banner if user has credits or while loading
  if (loading || credits > 0) {
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