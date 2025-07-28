import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';

export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | null;
  first_name: string | null;
  last_name: string | null;
}

// Cache for role data to avoid repeated API calls
const roleCache = new Map<string, { data: UserRole; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useRole = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>({
    user_id: null,
    role: null,
    first_name: null,
    last_name: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = user?.id || 'anonymous';
      const cached = roleCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setUserRole(cached.data);
        setIsLoading(false);
        return;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const token = await getToken();
        
        const response = await fetch('/api/v1/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserRole(data);
          
          // Cache the result
          roleCache.set(cacheKey, { data, timestamp: now });
        } else {
          console.error('Failed to fetch user role:', response.status);
          // Default to user role instead of null for better UX
          const defaultRole = { user_id: null, role: 'user' as const, first_name: null, last_name: null };
          setUserRole(defaultRole);
          roleCache.set(cacheKey, { data: defaultRole, timestamp: now });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching user role:', error);
        // Default to user role for any error (including 500 errors)
        const defaultRole = { user_id: null, role: 'user' as const, first_name: null, last_name: null };
        setUserRole(defaultRole);
        roleCache.set(cacheKey, { data: defaultRole, timestamp: now });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();

    // Cleanup function to abort ongoing requests when component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isLoaded, isSignedIn, getToken, user?.id]);

  const isAdmin = userRole.role === 'admin';
  const isUser = userRole.role === 'user';
  const hasRole = userRole.role !== null;

  return {
    userRole,
    isLoading,
    isAdmin,
    isUser,
    hasRole,
    refetch: () => {
      // Clear cache and trigger re-fetch
      if (user?.id) {
        roleCache.delete(user.id);
      }
      setIsLoading(true);
      setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
    }
  };
}; 