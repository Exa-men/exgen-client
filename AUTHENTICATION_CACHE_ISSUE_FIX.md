# Authentication Cache Issue Fix

## Problem Description

Users were experiencing a bug where after logging out from one account and logging into another account, they could still see credits from the first account. This indicated that authentication data was persisting between user sessions.

## Root Cause Analysis

The issue was caused by **token caching** in the authentication system:

1. **API Token Caching**: The `useApi` hook cached Clerk authentication tokens for 4 minutes to reduce repeated API calls
2. **Race Condition**: When users switched accounts, old cached tokens were still valid and used for API requests
3. **Credit Context Dependency**: The `CreditContext` depended on Clerk user state, but API calls used cached tokens that belonged to previous users
4. **Missing Cache Invalidation**: There was no mechanism to clear caches when authentication state changed

## Solution Implemented

### 1. Enhanced Token Cache Management (`useApi` hook)

- Added automatic token cache clearing when users sign out
- Added token cache clearing when new users sign in
- Implemented immediate cache invalidation on authentication state changes

### 2. Improved Credit Context (`CreditContext`)

- Added token cache clearing when user changes
- Added comprehensive cache clearing on sign out
- Added cleanup effects to prevent stale data persistence
- Enhanced state reset mechanisms

### 3. Enhanced Role Context (`RoleContext`)

- Added API token cache clearing on sign out
- Improved cleanup mechanisms for user role data

### 4. Clerk Error Boundary Improvements (`ClerkErrorBoundary`)

- Added authentication state change listeners
- Implemented localStorage cache clearing for user-specific data
- Enhanced error handling and cache management

## Key Changes Made

```typescript
// In useApi hook
useEffect(() => {
  if (isLoaded && !isSignedIn) {
    // Clear token cache on sign out
    tokenCache.current = { token: null, timestamp: 0 };
  }
}, [isLoaded, isSignedIn]);

useEffect(() => {
  if (isLoaded && isSignedIn) {
    // Clear token cache for new user sign in
    if (tokenCache.current.token) {
      tokenCache.current = { token: null, timestamp: 0 };
    }
  }
}, [isLoaded, isSignedIn]);

// In CreditContext
useEffect(() => {
  if (userLoaded && user?.id) {
    // Clear token cache for new user
    api.clearTokenCache();
  }
}, [user?.id, userLoaded, api]);

useEffect(() => {
  if (userLoaded && !isSignedIn) {
    // Clear all caches on sign out
    api.clearTokenCache();
    // Clear localStorage caches
    // Reset component state
  }
}, [userLoaded, isSignedIn, api]);
```

## Benefits of the Fix

1. **Immediate Cache Invalidation**: Caches are cleared as soon as authentication state changes
2. **Prevents Data Leakage**: No more credits or user data persisting between sessions
3. **Improved Security**: Old tokens cannot be used to access new user data
4. **Better User Experience**: Users see their own data immediately after login
5. **Robust Cleanup**: Multiple layers of cache clearing ensure no data persists

## Testing Recommendations

1. **Login/Logout Flow**: Test switching between different user accounts
2. **Credit Display**: Verify credits reset properly between users
3. **Role Changes**: Test admin/user role switching
4. **Cache Persistence**: Verify no data persists in localStorage after logout
5. **Performance**: Ensure cache clearing doesn't impact performance

## Token Expiration Handling

### How Clerk Token Expiration is Managed

The system has multiple layers of protection against token expiration:

#### 1. **Proactive Token Refresh**
- **Automatic Refresh**: Tokens are refreshed every 3 minutes (before the 4-minute cache expires)
- **Safety Margin**: 1-minute buffer prevents using expired tokens
- **Background Process**: Refresh happens automatically while user is active

#### 2. **Reactive Token Refresh**
- **401 Error Detection**: When API calls return 401 Unauthorized
- **Automatic Retry**: System immediately fetches new token and retries request
- **Transparent to User**: No interruption in user experience

#### 3. **Fallback Mechanisms**
- **Clerk Metadata**: Falls back to `user.publicMetadata.credits` if API fails
- **Graceful Degradation**: System continues working even with token issues
- **User Notification**: Clear error messages when re-authentication is needed

### What Happens When Tokens Expire

#### **Scenario 1: Normal API Call with Expired Token**
1. API call made with expired token
2. Backend returns 401 Unauthorized
3. System automatically clears expired token from cache
4. Fetches new token from Clerk
5. Retries original request with new token
6. User sees no interruption

#### **Scenario 2: Proactive Token Refresh**
1. System detects token is approaching expiration (3-minute mark)
2. Automatically fetches new token from Clerk
3. Updates cache with fresh token
4. User continues using system without interruption

#### **Scenario 3: Complete Authentication Failure**
1. If token refresh fails completely
2. System clears invalid token
3. Returns clear error message: "Authentication expired. Please sign in again."
4. User is prompted to re-authenticate

### Token Lifecycle Management

```
Token Created → Cached for 4 minutes → Proactively refreshed at 3 minutes
     ↓
If API call fails with 401 → Clear cache → Fetch new token → Retry request
     ↓
If refresh fails → Clear cache → Prompt user to re-authenticate
```

## Future Considerations

1. **Session Management**: Consider implementing session-based cache invalidation
2. **Cache Expiration**: Implement time-based cache expiration for additional security
3. **Monitoring**: Add logging to track cache clearing events
4. **Testing**: Add automated tests for authentication state changes
