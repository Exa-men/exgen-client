import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';



export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | null;
  first_name: string | null;
  last_name: string | null;
}

export const useRole = () => {
  const { isSignedIn, isLoaded } = useUser();
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
        } else {
          console.error('Failed to fetch user role:', response.status);
          // Default to user role instead of null for better UX
          setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching user role:', error);
        // Default to user role for any error (including 500 errors)
        setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
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
  }, [isLoaded, isSignedIn, getToken]);

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
      setIsLoading(true);
      // Trigger a re-fetch by updating the dependency
      setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
    }
  };
}; 