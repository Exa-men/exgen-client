"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import UnifiedHeader from './components/UnifiedHeader';
import Hero from './components/Hero';
import Features from './components/Features';
import Benefits from './components/Benefits';
import ProcessVideo from './components/ProcessVideo';
import Testimonial from './components/Testimonial';
import SchoolLogos from './components/SchoolLogos';
import CTASection from './components/CTASection';
import Footer from './components/Footer';

import { CookieNotification } from './components/CookieNotification';

function HomeContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only redirect if user is signed in and there's no 'show' parameter
    if (isLoaded && isSignedIn && !searchParams.get('show')) {
      router.push('/catalogus');
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If user is signed in and no 'show' parameter, don't render the homepage content (they'll be redirected)
  if (isSignedIn && !searchParams.get('show')) {
    return null;
  }

  // Only show homepage content for non-authenticated users
  return (
    <main>
      <UnifiedHeader />
      <Hero />
      <Features />
      <Benefits />
      <ProcessVideo />
      <Testimonial />
      <SchoolLogos />
      <CTASection />
      <Footer />
      <CookieNotification />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}