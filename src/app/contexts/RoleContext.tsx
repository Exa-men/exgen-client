"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useApi } from '@/hooks/use-api';
import { 
  trackRoleApiCall, 
  trackRoleCacheHit, 
  trackRoleCacheMiss, 
  trackRoleDuplicateRequest, 
  trackRoleResponseTime 
} from '../../lib/role-performance';

export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | null;
  first_name: string | null;
  last_name: string | null;
}

interface RoleContextType {
  userRole: UserRole;
  isAdmin: boolean;
  isUser: boolean;
  hasRole: boolean;
  isLoading: boolean;
  refreshRole: () => Promise<void>;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRoleContext = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleProvider');
  }
  return context;
};

// Cache configuration
const ROLE_CACHE_KEY = 'exgen_user_role_cache';
// Cache duration: 30 minutes (good balance of performance and data freshness)
const ROLE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Global request deduplication
let activeRequest: Promise<UserRole> | null = null;
let lastCacheTime = 0;

// Cache utility functions
const getCachedRole = (): UserRole | null => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (30-minute duration for optimal performance)
    if (now - timestamp < ROLE_CACHE_DURATION) {
      trackRoleCacheHit();
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(ROLE_CACHE_KEY);
    return null;
  } catch (error) {
    // console.warn('Failed to read cached role:', error);
    localStorage.removeItem(ROLE_CACHE_KEY);
    return null;
  }
};

const setCachedRole = (role: UserRole): void => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const cacheData = {
      data: role,
      timestamp: Date.now()
    };
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cacheData));
    lastCacheTime = Date.now();
    // console.log('💾 Role cached for 30 minutes (performance optimized)');
  } catch (error) {
    // console.warn('Failed to cache role:', error);
  }
};

const clearCachedRole = (): void => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(ROLE_CACHE_KEY);
    lastCacheTime = 0;
    // console.log('🗑️ Role cache cleared');
  } catch (error) {
    // console.warn('Failed to clear cached role:', error);
  }
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const api = useApi();
  const [userRole, setUserRole] = useState<UserRole>(() => {
    // Initialize with cached data if available
    const cachedRole = getCachedRole();
    if (cachedRole) {
      trackRoleCacheHit();
      return cachedRole;
    }
    trackRoleCacheMiss();
    return {
      user_id: null,
      role: null,
      first_name: null,
      last_name: null
    };
  });
  
  const [isLoading, setIsLoading] = useState(() => {
    // Start loading if no cached role is available
    const cachedRole = getCachedRole();
    return !cachedRole;
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequest = useRef<Promise<any> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1; // Reduced from 2 to prevent duplicate calls
  const requestInProgressRef = useRef(false); // Track if request is in progress

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        setIsLoading(false); // Ensure loading is set to false when not signed in
        clearCachedRole();
        return;
      }

      // Additional safety check: ensure user object is available
      if (!user?.id) {
        // console.warn('User ID not available, skipping role fetch');
        setIsLoading(false); // Ensure loading is set to false when user ID is not available
        return;
      }

      // Check cache first (30-minute duration for optimal performance)
      const cachedRole = getCachedRole();
      if (cachedRole && cachedRole.user_id === user?.id) {
        setUserRole(cachedRole);
        setIsLoading(false); // Ensure loading is set to false when using cached role
        return;
      }

      // Prevent duplicate requests
      if (activeRequest.current) {
        trackRoleDuplicateRequest();
        try {
          const result = await activeRequest.current;
          setUserRole(result);
          return;
        } catch (error) {
          // If the active request fails, continue with a new request
          // console.warn('Active request failed, retrying:', error);
        }
      }

      // Additional deduplication check
      if (requestInProgressRef.current) {
        // console.log('🔄 Request already in progress, skipping duplicate');
        return;
      }

      // Create new request with timeout protection
      setIsLoading(true);
      requestInProgressRef.current = true; // Mark request as in progress
      abortControllerRef.current = new AbortController();
      
      const startTime = Date.now();
      try {
        // Track API call
        trackRoleApiCall();
        
        // console.log('🔍 Starting role fetch at:', new Date().toISOString());
        
        // Add timeout protection for role API calls (3s timeout for better UX)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 3000) // 3 seconds timeout
        );
        
        // Create the request promise using centralized API
        const requestPromise = api.getUserRole().then(async (response: any) => {
          if (response.error) {
            // console.error('Failed to fetch user role:', response.error);
            throw new Error(`HTTP ${response.error.status || 'Unknown'}`);
          }
          return response.data;
        });

        // Store the active request
        activeRequest.current = requestPromise;
        
        // Race between request and timeout
        const data = await Promise.race([requestPromise, timeoutPromise]);
        setUserRole(data);
        
        // Track response time
        const responseTime = Date.now() - startTime;
        trackRoleResponseTime(responseTime);
        
        // console.log('✅ Role fetch completed in:', responseTime, 'ms');
        
      } catch (error) {
        if (error instanceof Error &&
            error.name === 'AbortError') {
          // console.log('Role fetch was aborted');
          return;
        }
        
        // Handle timeout specifically
        if (error instanceof Error && error.message === 'Request timeout') {
          // console.warn('Role fetch timed out after 3 seconds - this might indicate a slow backend response');
          
          // Retry the request if we haven't exceeded max retries
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            // console.log(`🔄 Retrying role fetch (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
            
            // Small delay before retry
            setTimeout(() => {
              fetchUserRole();
            }, 1000); // Reduced from 2000ms to 1000ms for faster retry
            return;
          }
          
          // Don't fail completely on timeout, try to use cached data or default
          const cachedRole = getCachedRole();
          if (cachedRole && cachedRole.user_id === user?.id) {
            // console.log('Using cached role data due to timeout');
            setUserRole(cachedRole);
            return;
          }
        }
        
        // console.error('Error fetching user role:', error);
        // Fall back to cached data if available, otherwise use default
        const cachedRole = getCachedRole();
        if (cachedRole && cachedRole.user_id === user?.id) {
          setUserRole(cachedRole);
        } else {
          setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
        }
      } finally {
        setIsLoading(false);
        activeRequest.current = null;
        retryCountRef.current = 0; // Reset retry count on completion
        requestInProgressRef.current = false; // Mark request as finished
      }
    };

    // Remove artificial delay - start fetching immediately when ready
    fetchUserRole();
    
    return () => {
      // Cleanup function to abort ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isLoaded, isSignedIn, user?.id]);

  // Cleanup effect for logout
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // User has signed out, ensure complete cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeRequest.current = null;
      setIsLoading(false);
      
      // Clear cached role data to prevent role escalation between users
      clearCachedRole();
      
      // Reset all state to initial values
      setUserRole({
        user_id: null,
        role: null,
        first_name: null,
        last_name: null
      });
      
      // Reset retry counters
      retryCountRef.current = 0;
      requestInProgressRef.current = false;
      
      // console.log('🔐 Role context completely reset on sign out');
    }
  }, [isLoaded, isSignedIn, clearCachedRole]);

  // Global sign out event listener for additional cleanup
  useEffect(() => {
    const handleGlobalSignOut = () => {
      // console.log('🔔 Role context received global sign out event');
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeRequest.current = null;
      
      // Clear cache and reset state
      clearCachedRole();
      setUserRole({
        user_id: null,
        role: null,
        first_name: null,
        last_name: null
      });
      setIsLoading(false);
      retryCountRef.current = 0;
      requestInProgressRef.current = false;
      
      // console.log('🔐 Role context reset via global sign out event');
    };

    // Listen for global sign out events
    if (typeof window !== 'undefined') {
      window.addEventListener('user-signed-out', handleGlobalSignOut);
      
      return () => {
        window.removeEventListener('user-signed-out', handleGlobalSignOut);
      };
    }
  }, [clearCachedRole]);

  // Function to manually refresh role (useful for admin role changes)
  const refreshRole = useCallback(async () => {
    clearCachedRole();
    // Trigger a re-fetch by updating the user ID dependency
    if (user?.id) {
      // Force re-fetch by temporarily clearing the user ID
      setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
    }
  }, [user?.id]);

  // Function to clear role cache (useful for logout)
  const clearRole = useCallback(() => {
    // Abort any ongoing requests first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear the global active request
    activeRequest.current = null;
    
    // Clear cache and reset state
    clearCachedRole();
    setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
    setIsLoading(false);
  }, []);

  const value: RoleContextType = {
    userRole,
    isAdmin: userRole.role === 'admin',
    isUser: userRole.role === 'user',
    hasRole: userRole.role !== null,
    isLoading,
    refreshRole,
    clearRole,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};
