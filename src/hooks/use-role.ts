import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export interface UserRole {
  user_id: string | null;
  role: 'user' | 'admin' | null;
  first_name: string | null;
  last_name: string | null;
}

export const useRole = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>({
    user_id: null,
    role: null,
    first_name: null,
    last_name: null
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isLoaded || !isSignedIn) {
        setUserRole({ user_id: null, role: null, first_name: null, last_name: null });
        return;
      }

      try {
        const token = await getToken();
        
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
          setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole({ user_id: null, role: 'user', first_name: null, last_name: null });
      }
    };

    fetchUserRole();
  }, [isLoaded, isSignedIn, getToken, user?.id]);

  return {
    userRole,
    isAdmin: userRole.role === 'admin',
    isUser: userRole.role === 'user',
    hasRole: userRole.role !== null,
  };
}; 