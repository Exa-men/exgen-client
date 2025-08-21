import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Downloads the inkoopvoorwaarden PDF file
 */
export function downloadInkoopvoorwaarden() {
  const link = document.createElement('a');
  link.href = '/inkoopvoorwaarden.pdf';
  link.download = 'inkoopvoorwaarden.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Comprehensive cache clearing utility for sign out
 * Ensures all user-specific data is removed from various storage mechanisms
 */
export const clearAllUserCaches = async (): Promise<void> => {
  try {
    console.log('🧹 Starting comprehensive cache cleanup...');
    
    // Clear localStorage caches
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('exgen_') || 
          key.includes('clerk_') || 
          key.includes('user_') ||
          key.includes('auth_') ||
          key.includes('role_') ||
          key.includes('credit_') ||
          key.includes('voucher_') ||
          key.includes('workflow_') ||
          key.includes('catalog_') ||
          key.includes('verification_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Cleared localStorage:', key);
      });
      
      // Clear sessionStorage completely
      sessionStorage.clear();
      console.log('🗑️ Cleared sessionStorage');
      
      // Clear HTTP caches
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
          console.log('🗑️ Cleared HTTP caches:', cacheNames.length, 'caches');
        } catch (error) {
          console.warn('Could not clear HTTP caches:', error);
        }
      }
      
      // Clear IndexedDB if available
      if ('indexedDB' in window) {
        try {
          const databases = await window.indexedDB.databases();
          databases.forEach(db => {
            if (db.name && (
              db.name.includes('exgen') || 
              db.name.includes('clerk') || 
              db.name.includes('user') ||
              db.name.includes('auth')
            )) {
              window.indexedDB.deleteDatabase(db.name);
              console.log('🗑️ Deleted IndexedDB:', db.name);
            }
          });
        } catch (error) {
          console.warn('Could not clear IndexedDB:', error);
        }
      }
    }
    
          // Clear any in-memory caches
      if (typeof window !== 'undefined') {
        // Clear any global variables that might contain user data
        if (window.__NEXT_DATA__) {
          // Clear Next.js data cache
          delete window.__NEXT_DATA__;
          console.log('🗑️ Cleared Next.js data cache');
        }
        
        // Clear cookies (only those we can access)
        document.cookie.split(";").forEach(function(c) { 
          if (c.trim().startsWith('exgen_') || c.trim().startsWith('clerk_') || c.trim().startsWith('user_')) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            console.log('🗑️ Cleared cookie:', c.trim().split('=')[0]);
          }
        });
      }
    
    console.log('✅ Comprehensive cache cleanup completed');
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error);
    throw error;
  }
};

/**
 * Force refresh the page to ensure complete state reset
 * Use this as a last resort if cache clearing doesn't work
 */
export const forcePageRefresh = (): void => {
  if (typeof window !== 'undefined') {
    console.log('🔄 Force refreshing page for complete state reset...');
    window.location.reload();
  }
};

/**
 * Clear all browser storage mechanisms
 * This is a nuclear option for complete cleanup
 */
export const clearAllBrowserStorage = (): void => {
  if (typeof window !== 'undefined') {
    try {
      // Clear localStorage
      localStorage.clear();
      console.log('🗑️ Cleared localStorage completely');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('🗑️ Cleared sessionStorage completely');
      
      // Clear cookies (only those we can access)
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      console.log('🗑️ Cleared accessible cookies');
      
      // Clear any remaining in-memory data
      if (window.__NEXT_DATA__) {
        delete window.__NEXT_DATA__;
        console.log('🗑️ Cleared Next.js data cache');
      }
      
      console.log('✅ All browser storage cleared');
    } catch (error) {
      console.error('❌ Error clearing browser storage:', error);
    }
  }
}; 