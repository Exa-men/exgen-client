"use client"

import React from 'react';
import { Wallet } from 'lucide-react';
import { useCredits } from '../contexts/CreditContext';
import { cn } from '../../lib/utils';

interface CreditDisplayProps {
  className?: string;
  showLabel?: boolean;
  onOrderCredits?: () => void;
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ 
  className, 
  showLabel = false,
  onOrderCredits
}) => {
  const { credits, loading } = useCredits();

  if (loading) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-gray-700",
        className
      )}>
        <Wallet className="h-4 w-4 text-examen-cyan" />
        <span className="font-medium text-sm">...</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-gray-700",
      onOrderCredits && "cursor-pointer hover:text-examen-cyan transition-colors",
      className
    )} onClick={onOrderCredits}>
      <Wallet className="h-4 w-4 text-examen-cyan" />
      <span className="font-medium text-sm">
        {credits} {showLabel ? 'credits' : ''}
      </span>
    </div>
  );
};

export default CreditDisplay; 