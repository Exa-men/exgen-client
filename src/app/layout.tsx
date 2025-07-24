import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { CreditProvider } from './contexts/CreditContext';
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
  title: 'ExGen',
  description: 'Generate examination instruments for Dutch vocational education',
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
            {children}
            {/* Railway deployment indicator */}
            {process.env.NODE_ENV === 'production' && (
              <div style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: '#6366f1',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 9999,
                opacity: 0.7
              }}>
                🚂 Railway
              </div>
            )}
          </CreditProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}