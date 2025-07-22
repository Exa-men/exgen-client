# Role-Based Access Control System

This document describes the role-based access control (RBAC) system implemented in the ExGen application.

## Overview

The system implements a two-tier role system:
- **User**: Regular users with basic access to core features
- **Admin**: Administrators with access to user management and system settings

## Backend Implementation

### Database Schema

The `users` table includes a `role` column:
```sql
ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user';
```

### Authentication & Authorization

**File**: `src/auth.py`

- `get_current_user()` - Get full user object with role
- `require_admin()` - Require admin role for access
- `require_role(role)` - Require specific role
- `get_user_role()` - Get user role without requiring authentication

### Admin Endpoints

All admin endpoints are prefixed with `/api/v1/admin/`:

- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/users/{user_id}` - Get specific user
- `PATCH /api/v1/admin/users/{user_id}/role` - Update user role
- `GET /api/v1/admin/users/{user_id}/credits` - Get user credits
- `PATCH /api/v1/admin/users/{user_id}/credits` - Update user credits

### Protected Endpoints

The following endpoints now require admin access:
- `POST /api/v1/config/migrate-defaults`
- `POST /api/v1/config/reset-to-defaults`
- `GET /api/v1/config/status`

## Frontend Implementation

### Role Management Hook

**File**: `src/hooks/use-role.ts`

Provides role-based utilities:
```typescript
const { userRole, isLoading, isAdmin, isUser, hasRole } = useRole();
```

### Role Guard Components

**File**: `src/components/RoleGuard.tsx`

- `RoleGuard` - Conditional rendering based on roles
- `AdminOnly` - Show content only to admins
- `UserOnly` - Show content only to regular users

### Admin Pages

- `/admin` - Main admin dashboard
- `/admin/users` - User management interface
- `/admin/settings` - System configuration
- `/admin/analytics` - Usage statistics

### Navigation Updates

The header navigation now includes an "Admin" link for admin users.

## Usage Examples

### Backend - Protecting Endpoints

```python
@app.get("/api/v1/admin/users")
async def list_users(admin_user: User = Depends(require_admin)):
    # Only admins can access this endpoint
    pass
```

### Frontend - Conditional Rendering

```tsx
<AdminOnly fallback={<AccessDenied />}>
  <UserManagement />
</AdminOnly>
```

### Frontend - Role Checking

```tsx
const { isAdmin } = useRole();

if (isAdmin) {
  // Show admin features
}
```

## Default Behavior

- New users are automatically assigned the `user` role
- Admin roles must be manually assigned through the admin interface
- Users without proper roles see appropriate access denied messages

## Security Considerations

- All admin endpoints validate JWT tokens and check admin role
- Frontend role checks are for UX only - backend validation is required
- Role changes are logged and auditable
- Admin actions are protected at both frontend and backend levels

## Testing

To test the role system:

1. Create a test admin user in the database
2. Log in with admin credentials
3. Access `/admin` to verify admin access
4. Test user management features
5. Verify regular users cannot access admin pages

## Future Enhancements

- Role-based audit logging
- More granular permissions (e.g., read-only admin)
- Role inheritance and hierarchies
- Time-based role assignments
- Integration with Clerk user metadata 