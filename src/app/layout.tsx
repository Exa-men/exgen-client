import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { RoleProvider } from './contexts/RoleContext';
import { CreditProvider } from './contexts/CreditContext';
import { CreditModalProvider } from './contexts/CreditModalContext';
import { AuthModalProvider } from './contexts/AuthModalContext';
import SmartPrefetcher from './components/SmartPrefetcher';
import PageTransitionLoader from './components/PageTransitionLoader';
import UnifiedHeader from './components/UnifiedHeader';
import CreditOrderModal from './components/CreditOrderModal';
import { AuthModal } from './components/auth/AuthModal';
import ClerkErrorBoundary from './components/ClerkErrorBoundary';
import type { Metadata } from 'next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'exa.men',
  description: 'Examenleverancier voor het MBO',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      // Add Clerk performance optimizations based on configuration analysis
      appearance={{
        // Reduce Clerk UI rendering overhead
        elements: {
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
          card: 'shadow-lg',
        },
        // Optimize for development environment
        variables: {
          colorPrimary: '#6c47ff',
          colorBackground: '#ffffff',
          colorText: '#151515',
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ClerkErrorBoundary>
            <RoleProvider>
              <CreditProvider>
                <CreditModalProvider>
                  <AuthModalProvider>
                    <SmartPrefetcher />
                    <PageTransitionLoader />
                    <UnifiedHeader />
                    {children}
                    <CreditOrderModal />
                    <AuthModal />
                    {/* Development-only performance monitoring - REMOVED due to performance impact */}
                    {/* {process.env.NODE_ENV === 'development' && <RolePerformanceDebug />} */}
                  </AuthModalProvider>
                </CreditModalProvider>
              </CreditProvider>
            </RoleProvider>
          </ClerkErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}