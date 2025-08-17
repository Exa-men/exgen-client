"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApi } from '@/hooks/use-api';

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
  const api = useApi();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
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
      const { data, error } = await api.getCreditBalance();
      
      if (error) {
        console.error('Error fetching credits:', error);
        // Fallback to Clerk metadata if API fails
        setCredits(user?.publicMetadata?.credits as number || 0);
      } else {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      // Fallback to Clerk metadata
      setCredits(user?.publicMetadata?.credits as number || 0);
    } finally {
      setLoading(false);
    }
  }, [user, userLoaded]);

  const refreshCredits = useCallback(async () => {
    await fetchCredits();
  }, [fetchCredits]);

  useEffect(() => {
    fetchCredits();
  }, [user, userLoaded]);

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