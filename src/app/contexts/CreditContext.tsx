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
  updateVoucherStatus: (voucherId: string, updates: any, skipRefresh?: boolean) => void;
  registerVoucherUpdateCallback: (callback: (voucherId: string, updates: any) => void) => () => void;
  refreshCurrentUserCredits: () => Promise<void>;
  refreshUserCredits: (userId: string) => Promise<void>;
  registerCreditUpdateCallback: (callback: (userId: string) => void) => () => void;
  broadcastCreditUpdate: (userId: string) => void;
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
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const api = useApi();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1; // Reduced from 2 to prevent duplicate calls
  const requestInProgressRef = useRef(false); // Track if request is in progress
  
  // Callback refs for voucher refresh
  const voucherRefreshCallbacks = React.useRef<Set<() => void>>(new Set());
  
  // Callback refs for immediate voucher updates (for optimistic UI)
  const voucherUpdateCallbacks = React.useRef<Set<(voucherId: string, updates: any) => void>>(new Set());
  
  // Callback refs for credit updates (when admin updates user credits)
  const creditUpdateCallbacks = React.useRef<Set<(userId: string) => void>>(new Set());

  // Clear token cache when user changes to prevent using old tokens
  useEffect(() => {
    if (userLoaded && user?.id) {
      // Clear any cached tokens when a new user logs in
      api.clearTokenCache();
      // console.log('🔐 Cleared token cache for new user:', user.id);
    }
  }, [user?.id, userLoaded, api]);

  // Clear all caches when user signs out
  useEffect(() => {
    if (userLoaded && !isSignedIn) {
      // User signed out - clear all caches and reset state
      setCredits(0);
      setLoading(false);
      retryCountRef.current = 0;
      requestInProgressRef.current = false;
      
      // Clear API token cache
      api.clearTokenCache();
      
      // Clear any localStorage caches
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('exgen_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          // console.log('🗑️ Cleared cached data:', key);
        });
      }
      
      // Clear callback refs
      voucherRefreshCallbacks.current.clear();
      voucherUpdateCallbacks.current.clear();
      creditUpdateCallbacks.current.clear();
      
      // console.log('🔐 Cleared all caches and callbacks on sign out');
    }
  }, [userLoaded, isSignedIn, api]);

  // Global sign out event listener for additional cleanup
  useEffect(() => {
    const handleGlobalSignOut = () => {
      // console.log('🔔 Credit context received global sign out event');
      
      // Reset all state
      setCredits(0);
      setLoading(false);
      retryCountRef.current = 0;
      requestInProgressRef.current = false;
      
      // Clear API token cache
      api.clearTokenCache();
      
      // Clear callback refs
      voucherRefreshCallbacks.current.clear();
      voucherUpdateCallbacks.current.clear();
      creditUpdateCallbacks.current.clear();
      
      // console.log('🔐 Credit context reset via global sign out event');
    };

    // Listen for global sign out events
    if (typeof window !== 'undefined') {
      window.addEventListener('user-signed-out', handleGlobalSignOut);
      
      return () => {
        window.removeEventListener('user-signed-out', handleGlobalSignOut);
      };
    }
  }, [api]);

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
      // console.log('🔄 Credit request already in progress, skipping duplicate');
      return;
    }

    // console.log('🔍 Starting credit fetch at:', new Date().toISOString());
    const startTime = performance.now();
    requestInProgressRef.current = true; // Mark request as in progress

    try {
      // Add timeout protection for Clerk-dependent calls (as recommended by Clerk Support)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000) // Reduced to 5 seconds for better UX
      );
      
      const requestPromise = api.getCreditBalance().then(async (response: any) => {
        // console.log('🔍 CreditContext: API response received:', response);
        
        if (response.error) {
          // console.error('❌ Error fetching credits:', response.error);
          // Fallback to Clerk metadata if API fails
          const fallbackCredits = user?.publicMetadata?.credits as number || 0;
          // console.log('⚠️ Using fallback credits from Clerk metadata:', fallbackCredits);
          setCredits(fallbackCredits);
          setLoading(false);
          return;
        }
        
        if (!response.data) {
          // console.warn('⚠️ No data in API response:', response);
          const fallbackCredits = user?.publicMetadata?.credits as number || 0;
          setCredits(fallbackCredits);
          setLoading(false);
          return;
        }
        
        // console.log('✅ Credit data received:', response.data);
        return response.data; // Return the actual data, not the wrapped response
      });

      // Race between request and timeout
      try {
        const result = await Promise.race([requestPromise, timeoutPromise]);
        
        // If we get here, the request succeeded (timeout would have thrown)
        const creditValue = (result as any)?.credits;
        // Ensure we have a valid credit value before setting loading to false
        if (creditValue !== undefined && creditValue !== null) {
          setCredits(creditValue);
          setLoading(false);
        } else {
          // console.warn('⚠️ Invalid credit value received:', creditValue);
          // Use fallback if API returns invalid data
          const fallbackCredits = user?.publicMetadata?.credits as number || 0;
          setCredits(fallbackCredits);
          setLoading(false);
        }
      } catch (error) {
        // Handle timeout specifically
        if (error instanceof Error && error.message === 'Request timeout') {
          // console.warn('Credit fetch timed out after 5 seconds - this might indicate a slow backend response');
          
          // Retry the request if we haven't exceeded max retries
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            // console.log(`🔄 Retrying credit fetch (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
            
            // Small delay before retry
            setTimeout(() => {
              fetchCredits();
            }, 2000); // Increased from 1000ms to 2000ms to prevent rapid retries
            return;
          }
          
          // Don't fail completely on timeout, use Clerk metadata as fallback
          const fallbackCredits = user?.publicMetadata?.credits as number || 0;
          setCredits(fallbackCredits);
          // console.log('⚠️ Using fallback credits from Clerk metadata:', fallbackCredits);
          setLoading(false);
          return;
        }
        
        // console.error('Error fetching credits:', error);
        // Fallback to Clerk metadata if API fails
        const fallbackCredits = user?.publicMetadata?.credits as number || 0;
        setCredits(fallbackCredits);
        // console.log('⚠️ Using fallback credits from Clerk metadata:', fallbackCredits);
        setLoading(false);
      }
      
      const responseTime = performance.now() - startTime;
      // console.log('✅ Credit fetch completed in:', responseTime.toFixed(0), 'ms');
      
    } catch (error) {
      // console.error('❌ Unexpected error in fetchCredits:', error);
      // console.error('❌ Error type:', typeof error);
      // console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      
      // Fallback to Clerk metadata
      const fallbackCredits = user?.publicMetadata?.credits as number || 0;
      setCredits(fallbackCredits);
      // console.log('⚠️ Using fallback credits from Clerk metadata:', fallbackCredits);
      setLoading(false);
    } finally {
      // Only reset retry count and request status, don't set loading here
      retryCountRef.current = 0; // Reset retry count on completion
      requestInProgressRef.current = false; // Mark request as finished
    }
  }, [user, userLoaded, api]);

  const refreshCredits = useCallback(async () => {
    await fetchCredits();
  }, [fetchCredits]);

  const refreshCurrentUserCredits = useCallback(async () => {
    // Force refresh credits for the current user
    // This is useful when credits are updated by an admin
    // console.log('🔄 Refreshing current user credits...');
    await fetchCredits();
  }, [fetchCredits]);

  const refreshUserCredits = useCallback(async (userId: string) => {
    // Refresh credits for a specific user
    // This is useful when admin updates another user's credits
    if (user?.id === userId) {
      // console.log(`🔄 Refreshing credits for user ${userId} (current user)`);
      await fetchCredits();
    }
    
    // Notify all registered callbacks about the credit update
    creditUpdateCallbacks.current.forEach(callback => callback(userId));
  }, [user?.id, fetchCredits]);

  const broadcastCreditUpdate = useCallback((userId: string) => {
    // Broadcast credit update to all registered components
    // console.log(`📢 Broadcasting credit update for user ${userId}`);
    creditUpdateCallbacks.current.forEach(callback => callback(userId));
  }, []);

  const refreshVouchers = useCallback(() => {
    // Call all registered voucher refresh callbacks
    voucherRefreshCallbacks.current.forEach(callback => callback());
  }, []);

  const updateVoucherStatus = useCallback((voucherId: string, updates: any, skipRefresh = false) => {
    // Immediately update voucher status for optimistic UI updates
    // This function will be called when a voucher is redeemed to update the admin view
    // console.log('🎫 CreditContext: updateVoucherStatus called with:', { voucherId, updates, skipRefresh });
    // console.log('🎫 CreditContext: Number of registered voucher update callbacks:', voucherUpdateCallbacks.current.size);
    // console.log('🎫 CreditContext: Number of registered voucher refresh callbacks:', voucherRefreshCallbacks.current.size);
    
    // Notify all registered voucher update callbacks with the specific voucher data
    // This allows components to update just the specific voucher instead of refreshing everything
    voucherUpdateCallbacks.current.forEach((callback, index) => {
      // console.log(`🎫 CreditContext: Calling voucher update callback ${index}`);
      try {
        callback(voucherId, updates);
      } catch (error) {
        // console.error(`🎫 CreditContext: Error in voucher update callback ${index}:`, error);
      }
    });
    
    // Only call refresh callbacks if not skipping (for components that need full refresh)
    if (!skipRefresh) {
      // console.log('🎫 CreditContext: Calling voucher refresh callbacks');
      voucherRefreshCallbacks.current.forEach((callback, index) => {
        // console.log(`🎫 CreditContext: Calling voucher refresh callback ${index}`);
        try {
          callback();
        } catch (error) {
          // console.error(`🎫 CreditContext: Error in voucher refresh callback ${index}:`, error);
        }
      });
    } else {
      // console.log('🎫 CreditContext: Skipping voucher refresh callbacks');
    }
  }, []);

  const registerVoucherRefresh = useCallback((callback: () => void) => () => {
    // console.log('🎫 CreditContext: Registering voucher refresh callback');
    voucherRefreshCallbacks.current.add(callback);
    // console.log('🎫 CreditContext: Total voucher refresh callbacks:', voucherRefreshCallbacks.current.size);
    return () => {
      // console.log('🎫 CreditContext: Unregistering voucher refresh callback');
      voucherRefreshCallbacks.current.delete(callback);
      // console.log('🎫 CreditContext: Total voucher refresh callbacks after unregister:', voucherRefreshCallbacks.current.size);
    };
  }, []);

  const registerVoucherUpdateCallback = useCallback((callback: (voucherId: string, updates: any) => void) => () => {
    // console.log('🎫 CreditContext: Registering voucher update callback');
    voucherUpdateCallbacks.current.add(callback);
    // console.log('🎫 CreditContext: Total voucher update callbacks:', voucherUpdateCallbacks.current.size);
    return () => {
      // console.log('🎫 CreditContext: Unregistering voucher update callback');
      voucherUpdateCallbacks.current.delete(callback);
      // console.log('🎫 CreditContext: Total voucher update callbacks after unregister:', voucherUpdateCallbacks.current.size);
    };
  }, []);

  const registerCreditUpdateCallback = useCallback((callback: (userId: string) => void) => {
    creditUpdateCallbacks.current.add(callback);
    return () => {
      creditUpdateCallbacks.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    // Only fetch credits when user is fully loaded and signed in
    if (userLoaded && isSignedIn && user) {
      // console.log('🔍 CreditContext: User ready, fetching credits for:', user.id);
      
      // Add a small delay to ensure backend user creation is complete
      // This prevents race conditions during signup
      const timer = setTimeout(() => {
        // console.log('🔍 CreditContext: Delayed credit fetch starting...');
        fetchCredits();
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    } else if (userLoaded && !isSignedIn) {
      // User signed out, reset credits
      // console.log('🔍 CreditContext: User signed out, resetting credits');
      setCredits(0);
      setLoading(false);
    }
  }, [user, userLoaded, isSignedIn, fetchCredits]);

  // Cleanup effect to clear caches when user changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear caches when component unmounts or user changes
      if (requestInProgressRef.current) {
        requestInProgressRef.current = false;
      }
      retryCountRef.current = 0;
    };
  }, [user?.id]);

  const value = {
    credits,
    loading,
    refreshCredits,
    refreshVouchers,
    registerVoucherRefresh,
    updateVoucherStatus,
    refreshCurrentUserCredits,
    refreshUserCredits,
    registerCreditUpdateCallback,
    broadcastCreditUpdate,
    registerVoucherUpdateCallback
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}; 