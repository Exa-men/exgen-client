import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { CreditProvider } from './contexts/CreditContext';
import { CreditModalProvider } from './contexts/CreditModalContext';
import { AuthModalProvider } from './contexts/AuthModalContext';
import SmartPrefetcher from './components/SmartPrefetcher';
import PageTransitionLoader from './components/PageTransitionLoader';
import UnifiedHeader from './components/UnifiedHeader';
import CreditOrderModal from './components/CreditOrderModal';
import { AuthModal } from './components/auth/AuthModal';
import RolePerformanceDebug from './components/RolePerformanceDebug';
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
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <CreditProvider>
            <CreditModalProvider>
              <AuthModalProvider>
                <SmartPrefetcher />
                <PageTransitionLoader />
                <UnifiedHeader />
                {children}
                <CreditOrderModal />
                <AuthModal />
                {/* Development-only performance monitoring */}
                {process.env.NODE_ENV === 'development' && <RolePerformanceDebug />}
              </AuthModalProvider>
            </CreditModalProvider>
          </CreditProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}