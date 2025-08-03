import React from 'react';
import { useRole } from '../hooks/use-role';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'admin')[];
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = ['user', 'admin'],
  fallback = null,
  requireAuth = true
}) => {
  const { isAdmin, isUser, hasRole } = useRole();

  // If auth is required but user is not signed in, show fallback
  if (requireAuth && !hasRole) {
    return <>{fallback}</>;
  }

  // Check if user has an allowed role
  const hasAllowedRole = 
    (isAdmin && allowedRoles.includes('admin')) ||
    (isUser && allowedRoles.includes('user'));

  if (!hasAllowedRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common role checks
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard allowedRoles={['admin']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const UserOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard allowedRoles={['user']} fallback={fallback}>
    {children}
  </RoleGuard>
); 