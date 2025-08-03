"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useRole } from '../../hooks/use-role';

/**
 * SmartPrefetcher component that prefetches pages based on user authentication and role
 * This provides a seamless navigation experience by preloading pages in the background
 */
const SmartPrefetcher: React.FC = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { isAdmin } = useRole();

  useEffect(() => {
    // Only start prefetching when user is loaded and signed in
    if (!isLoaded || !isSignedIn) return;

    const prefetchPages = async () => {
      try {
        // Always prefetch core user pages
        const userPages = [
          '/catalogus',
        ];

        // Prefetch admin pages if user is admin
        const adminPages = isAdmin ? [
          '/workflows',
          '/users',
          '/admin/credit-orders',
          '/admin/vouchers',
        ] : [];

        // Combine all pages to prefetch
        const allPages = [...userPages, ...adminPages];

        // Prefetch all pages in parallel
        await Promise.all(
          allPages.map(page => router.prefetch(page))
        );

      } catch (error) {
        console.warn('Failed to prefetch some pages:', error);
      }
    };

    // Small delay to ensure the app is stable after login
    const timer = setTimeout(prefetchPages, 1000);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, isAdmin, router]);

  // This component doesn't render anything
  return null;
};

export default SmartPrefetcher; 