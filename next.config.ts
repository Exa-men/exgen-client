import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  output: 'standalone',
  poweredByHeader: false,
  
  // Performance optimizations
  experimental: {
    // Enable optimizations for better performance
    optimizePackageImports: ['@clerk/nextjs', 'lucide-react'],
    // Note: serverComponentsExternalPackages conflicts with transpilePackages for @clerk/nextjs
    // Using optimizePackageImports instead for better compatibility with Turbopack
  },
  
  // Enhanced caching and performance
  compress: true,
  generateEtags: true,
  
  // Clerk-specific performance optimizations
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    // Optimize Clerk for development performance
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/catalogus',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/catalogus',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  },
  
  // API rewrites for production
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    return [
      {
              source: '/api/v1/catalog/:path*',
      destination: `${backendUrl}/api/v1/catalog/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Add caching headers for better performance
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;