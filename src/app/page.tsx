"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/workflows');
    }
  }, [isLoaded, isSignedIn, router]);

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

  // If user is signed in, don't render the homepage content (they'll be redirected)
  if (isSignedIn) {
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