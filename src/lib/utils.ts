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

export async function clearAllCaches(): Promise<void> {
  try {
    // Remove verbose logging for production
    // console.log('🧹 Starting comprehensive cache cleanup...');
    
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    for (const key of localStorageKeys) {
      localStorage.removeItem(key);
      // console.log('🗑️ Cleared localStorage:', key);
    }

    // Clear sessionStorage
    sessionStorage.clear();
    // console.log('🗑️ Cleared sessionStorage');

    // Clear HTTP caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        // console.log('🗑️ Cleared HTTP caches:', cacheNames.length, 'caches');
      } catch (error) {
        // console.warn('Could not clear HTTP caches:', error);
      }
    }

    // Clear IndexedDB
    if ('indexedDB' in window) {
      try {
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            const request = window.indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => {
              // console.log('🗑️ Deleted IndexedDB:', db.name);
            };
            request.onerror = () => {
              // console.warn('Could not clear IndexedDB:', error);
            };
          }
        }
      } catch (error) {
        // console.warn('Could not clear IndexedDB:', error);
      }
    }

    // Clear Next.js data cache
    if (typeof window !== 'undefined' && 'next' in window) {
      try {
        // @ts-ignore
        window.next?.router?.reload();
        // console.log('🗑️ Cleared Next.js data cache');
      } catch (error) {
        // Ignore Next.js cache clearing errors
      }
    }

    // Clear cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        // console.log('🗑️ Cleared cookie:', c.trim().split('=')[0]);
      }
    }

    // console.log('✅ Comprehensive cache cleanup completed');
  } catch (error) {
    // console.error('❌ Error during cache cleanup:', error);
  }
}

export async function forceRefreshPage(): Promise<void> {
  try {
    // Clear all caches first
    await clearAllCaches();
    
    // Force a hard refresh
    // console.log('🔄 Force refreshing page for complete state reset...');
    
    if (typeof window !== 'undefined') {
      // Clear any remaining state
      window.location.reload();
    }
  } catch (error) {
    // Handle any errors silently in production
  }
}

export function clearBrowserStorage(): void {
  try {
    // Clear localStorage completely
    localStorage.clear();
    // console.log('🗑️ Cleared localStorage completely');

    // Clear sessionStorage completely
    sessionStorage.clear();
    // console.log('🗑️ Cleared sessionStorage completely');

    // Clear accessible cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const c of cookies) {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      }
      // console.log('🗑️ Cleared accessible cookies');
    }

    // Clear Next.js data cache
    if (typeof window !== 'undefined' && 'next' in window) {
      try {
        // @ts-ignore
        window.next?.router?.reload();
        // console.log('🗑️ Cleared Next.js data cache');
      } catch (error) {
        // Ignore Next.js cache clearing errors
      }
    }

    // console.log('✅ All browser storage cleared');
  } catch (error) {
    // console.error('❌ Error clearing browser storage:', error);
  }
} 