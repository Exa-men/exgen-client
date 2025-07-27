import React from 'react';
import { useRole } from '../hooks/use-role';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'admin' | 'owner')[];
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = ['user', 'admin', 'owner'],
  fallback = null,
  requireAuth = true
}) => {
  const { isAdmin, isOwner, isUser, hasRole, isLoading } = useRole();

  // Show loading state while checking role
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If auth is required but user is not signed in, show fallback
  if (requireAuth && !hasRole) {
    return <>{fallback}</>;
  }

  // Check if user has an allowed role
  const hasAllowedRole = 
    (isAdmin && allowedRoles.includes('admin')) ||
    (isOwner && allowedRoles.includes('owner')) ||
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
  <RoleGuard allowedRoles={['admin', 'owner']} fallback={fallback}>
    {children}
  </RoleGuard>
);

export const OwnerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <RoleGuard allowedRoles={['owner']} fallback={fallback}>
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