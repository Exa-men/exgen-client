"use client"

import React, { useEffect } from 'react';
import { useCredits } from '../contexts/CreditContext';
import { Button } from './ui/button';
import { CreditCard } from 'lucide-react';

interface CreditDisplayProps {
  onOrderCredits: () => void;
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ onOrderCredits }) => {
  const { credits, loading, registerCreditUpdateCallback } = useCredits();

  useEffect(() => {
    // Register callback to listen for credit updates from admin actions
    const unregister = registerCreditUpdateCallback((userId) => {
      console.log(`💳 CreditDisplay: Received credit update for user ${userId}`);
      // The credits will be automatically refreshed by the CreditContext
    });

    return unregister;
  }, [registerCreditUpdateCallback]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
        <CreditCard className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  // Don't render anything if credits is undefined/null (still loading)
  if (credits === undefined || credits === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
        <CreditCard className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-examen-cyan-50 text-examen-cyan rounded-lg">
        <CreditCard className="h-4 w-4" />
        <span className="font-medium">{credits} credits</span>
      </div>
      <Button
        onClick={onOrderCredits}
        variant="outline"
        size="sm"
        className="border-examen-cyan text-examen-cyan hover:bg-examen-cyan-100"
      >
        Bestellen
      </Button>
    </div>
  );
};

export default CreditDisplay; 