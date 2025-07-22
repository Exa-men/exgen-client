import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | null;
  username: string | null;
}

export const useRole = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRole>({
    user_id: null,
    role: null,
    username: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, username: null });
        setIsLoading(false);
        return;
      }

      try {
        const token = await (window as any).Clerk?.session?.getToken();
        const response = await fetch('/api/v1/user/role', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data);
        } else {
          console.error('Failed to fetch user role:', response.status);
          setUserRole({ user_id: null, role: null, username: null });
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole({ user_id: null, role: null, username: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [isLoaded, isSignedIn]);

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
      setUserRole({ user_id: null, role: null, username: null });
    }
  };
}; 