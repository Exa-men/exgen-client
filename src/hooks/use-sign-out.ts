import { useCallback } from 'react';
import { useClerk } from '@clerk/nextjs';
import { clearAllUserCaches } from '../lib/utils';

/**
 * Custom hook for comprehensive sign out with complete cache clearing
 * Ensures all user data is properly removed before signing out
 */
export const useSignOut = () => {
  const { signOut } = useClerk();

  const handleSignOut = useCallback(async () => {
    try {
      console.log('🔐 Starting comprehensive sign out process...');
      
      // Step 1: Clear all application caches
      await clearAllUserCaches();
      
      // Step 2: Clear any remaining in-memory state
      // This will be handled by the various context cleanup effects
      
      // Step 3: Proceed with Clerk's sign out
      console.log('🔐 Cache cleanup complete, proceeding with Clerk sign out...');
      await signOut();
      
      console.log('✅ Sign out completed successfully');
      
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      
      // Fallback: try to sign out anyway
      try {
        await signOut();
        console.log('✅ Fallback sign out completed');
      } catch (fallbackError) {
        console.error('❌ Fallback sign out also failed:', fallbackError);
        // Last resort: force page refresh
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    }
  }, [signOut]);

  return {
    signOut: handleSignOut,
    isSigningOut: false // You could add state management here if needed
  };
};
