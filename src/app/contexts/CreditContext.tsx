"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';

interface CreditContextType {
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
};

interface CreditProviderProps {
  children: ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    // Don't fetch if user is not loaded yet
    if (!userLoaded) {
      return;
    }

    // If no user, set loading to false and credits to 0
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/credits/balance', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      } else {
        // Fallback to Clerk metadata if API fails
        setCredits(user?.publicMetadata?.credits as number || 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      // Fallback to Clerk metadata
      setCredits(user?.publicMetadata?.credits as number || 0);
    } finally {
      setLoading(false);
    }
  };

  const refreshCredits = async () => {
    await fetchCredits();
  };

  useEffect(() => {
    fetchCredits();
  }, [user, userLoaded, getToken]);

  const value = {
    credits,
    loading,
    refreshCredits
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}; 