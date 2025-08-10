"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
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
const ROLE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    
    // Check if cache is still valid
    if (now - timestamp < ROLE_CACHE_DURATION) {
      trackRoleCacheHit();
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(ROLE_CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Failed to read cached role:', error);
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
  } catch (error) {
    console.warn('Failed to cache role:', error);
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
  } catch (error) {
    console.warn('Failed to clear cached role:', error);
  }
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
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
  
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        clearCachedRole();
        return;
      }

      // Additional safety check: ensure user object is available
      if (!user?.id) {
        console.warn('User ID not available, skipping role fetch');
        return;
      }

      // Check cache first
      const cachedRole = getCachedRole();
      if (cachedRole && cachedRole.user_id === user?.id) {
        setUserRole(cachedRole);
        return;
      }

      // Prevent duplicate requests
      if (activeRequest) {
        trackRoleDuplicateRequest();
        try {
          const result = await activeRequest;
          setUserRole(result);
          return;
        } catch (error) {
          // If the active request fails, continue with a new request
          console.warn('Active request failed, retrying:', error);
        }
      }

      // Create new request
      setIsLoading(true);
      abortControllerRef.current = new AbortController();
      
      const startTime = Date.now();
      try {
        const token = await getToken();
        
        // Additional safety check: ensure token is valid
        if (!token) {
          console.warn('No valid token available, skipping role fetch');
          setIsLoading(false);
          return;
        }
        
        // Track API call
        trackRoleApiCall();
        
        // Create the request promise
        const requestPromise = fetch('/api/v1/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            // Cache the successful response
            setCachedRole(data);
            return data;
          } else {
            console.error('Failed to fetch user role:', response.status);
            throw new Error(`HTTP ${response.status}`);
          }
        });

        // Store the active request
        activeRequest = requestPromise;
        
        const data = await requestPromise;
        setUserRole(data);
        
        // Track response time
        const responseTime = Date.now() - startTime;
        trackRoleResponseTime(responseTime);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, don't update state
          return;
        }
        
        console.error('Error fetching user role:', error);
        // Fall back to cached data if available, otherwise use default
        const cachedRole = getCachedRole();
        if (cachedRole && cachedRole.user_id === user?.id) {
          setUserRole(cachedRole);
        } else {
          setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
        }
      } finally {
        // Clear the active request
        activeRequest = null;
        setIsLoading(false);
      }
    };

    fetchUserRole();

    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isLoaded, isSignedIn, getToken, user?.id]);

  // Cleanup effect for logout
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // User has signed out, ensure complete cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeRequest = null;
      setIsLoading(false);
      
      // Clear cached role data to prevent role escalation between users
      clearCachedRole();
    }
  }, [isLoaded, isSignedIn]);

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
    activeRequest = null;
    
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
