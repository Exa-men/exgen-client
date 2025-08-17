"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApi } from '@/hooks/use-api';

interface CreditContextType {
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  refreshVouchers: () => void;
  registerVoucherRefresh: (callback: () => void) => () => void;
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
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1; // Reduced from 2 to prevent duplicate calls
  const requestInProgressRef = useRef(false); // Track if request is in progress
  
  // Callback refs for voucher refresh
  const voucherRefreshCallbacks = React.useRef<Set<() => void>>(new Set());

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

    // Prevent duplicate requests
    if (requestInProgressRef.current) {
      console.log('🔄 Credit request already in progress, skipping duplicate');
      return;
    }

    console.log('🔍 Starting credit fetch at:', new Date().toISOString());
    const startTime = performance.now();
    requestInProgressRef.current = true; // Mark request as in progress

    try {
      // Add timeout protection for Clerk-dependent calls (as recommended by Clerk Support)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000) // Reduced to 5 seconds for better UX
      );
      
      const requestPromise = api.getCreditBalance().then(async (response: any) => {
        if (response.error) {
          console.error('Error fetching credits:', response.error);
          // Fallback to Clerk metadata if API fails
          setCredits(user?.publicMetadata?.credits as number || 0);
          return;
        }
        return response;
      });

      // Race between request and timeout
      const { data, error } = await Promise.race([requestPromise, timeoutPromise]);
      
      if (error) {
        // Handle timeout specifically
        if (error instanceof Error && error.message === 'Request timeout') {
          console.warn('Credit fetch timed out after 10 seconds - this might indicate a slow backend response');
          
          // Retry the request if we haven't exceeded max retries
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            console.log(`🔄 Retrying credit fetch (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
            
            // Small delay before retry
            setTimeout(() => {
              fetchCredits();
            }, 2000); // Increased from 1000ms to 2000ms to prevent rapid retries
            return;
          }
          
          // Don't fail completely on timeout, use Clerk metadata as fallback
          setCredits(user?.publicMetadata?.credits as number || 0);
          return;
        }
        
        console.error('Error fetching credits:', error);
        // Fallback to Clerk metadata if API fails
        setCredits(user?.publicMetadata?.credits as number || 0);
      } else {
        setCredits((data as any).credits);
      }
      
      const responseTime = performance.now() - startTime;
      console.log('✅ Credit fetch completed in:', responseTime.toFixed(0), 'ms');
      
    } catch (error) {
      console.error('Error fetching credits:', error);
      // Fallback to Clerk metadata
      setCredits(user?.publicMetadata?.credits as number || 0);
    } finally {
      setLoading(false);
      retryCountRef.current = 0; // Reset retry count on completion
      requestInProgressRef.current = false; // Mark request as finished
    }
  }, [user, userLoaded, api]);

  const refreshCredits = useCallback(async () => {
    await fetchCredits();
  }, [fetchCredits]);

  const refreshVouchers = useCallback(() => {
    // Call all registered voucher refresh callbacks
    voucherRefreshCallbacks.current.forEach(callback => callback());
  }, []);

  const registerVoucherRefresh = useCallback((callback: () => void) => {
    voucherRefreshCallbacks.current.add(callback);
    return () => {
      voucherRefreshCallbacks.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [user, userLoaded]);

  const value = {
    credits,
    loading,
    refreshCredits,
    refreshVouchers,
    registerVoucherRefresh
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}; 