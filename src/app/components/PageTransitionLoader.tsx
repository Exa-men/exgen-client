"use client"

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * PageTransitionLoader provides a subtle loading indicator during page transitions
 * This gives users feedback that navigation is happening
 */
const PageTransitionLoader: React.FC = () => {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loading indicator briefly when pathname changes
    setIsLoading(true);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Brief loading state

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-gradient-to-r from-examen-cyan to-blue-500 animate-pulse" />
    </div>
  );
};

export default PageTransitionLoader; 