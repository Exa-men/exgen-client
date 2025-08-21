import { useCallback } from 'react';
import { useClerk } from '@clerk/nextjs';
import { clearAllCaches } from '../lib/utils';

/**
 * Custom hook for comprehensive sign out with complete cache clearing
 * Ensures all user data is properly removed before signing out
 */
export const useSignOut = () => {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      // Remove verbose logging for production
      // console.log('🔐 Starting comprehensive sign out process...');
      
      // Clear all caches first
      await clearAllCaches();
      
      // console.log('🔐 Cache cleanup complete, proceeding with Clerk sign out...');
      
      // Sign out from Clerk
      await signOut();
      
      // console.log('✅ Sign out completed successfully');
      
    } catch (error) {
      // console.error('❌ Error during sign out:', error);
      
      // Fallback: try to clear everything and redirect
      try {
        clearAllCaches(); // Use the existing function
        window.location.href = '/';
        // console.log('✅ Fallback sign out completed');
      } catch (fallbackError) {
        // console.error('❌ Fallback sign out also failed:', fallbackError);
        // Last resort: force page refresh
        window.location.reload();
      }
    }
  };

  return {
    signOut: handleSignOut,
    isSigningOut: false // You could add state management here if needed
  };
};
