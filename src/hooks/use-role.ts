import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | 'owner' | null;
  first_name: string | null;
  last_name: string | null;
}

export const useRole = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRole>({
    user_id: null,
    role: null,
    first_name: null,
    last_name: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        setIsLoading(false);
        return;
      }

      try {
        const token = await (window as any).Clerk?.session?.getToken();
        console.log('Fetching user role with token:', token ? 'Token present' : 'No token');
        
        const response = await fetch('/api/v1/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Role API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Role API response data:', data);
          setUserRole(data);
        } else {
          console.error('Failed to fetch user role:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          // Keep role as null instead of defaulting to user
          setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Keep role as null instead of defaulting to user
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [isLoaded, isSignedIn]);

  const isAdmin = userRole.role === 'admin';
  const isOwner = userRole.role === 'owner';
  const isUser = userRole.role === 'user';
  const hasRole = userRole.role !== null;

  // Helper function to check if user has admin or higher privileges
  const hasAdminAccess = isAdmin || isOwner;
  
  // Helper function to check if user has owner privileges
  const hasOwnerAccess = isOwner;

  return {
    userRole,
    isLoading,
    isAdmin,
    isOwner,
    isUser,
    hasRole,
    hasAdminAccess,
    hasOwnerAccess,
    refetch: () => {
      setIsLoading(true);
      // Trigger a re-fetch by updating the dependency
      setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
    }
  };
}; 