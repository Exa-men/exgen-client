import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [], // Fixed: was experimental.serverComponentsExternalPackages
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://exgen-production.up.railway.app',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://exgen-production.up.railway.app'),
  },
  async rewrites() {
    // Use the environment-based API base URL
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://exgen-production.up.railway.app');
    
    return [
      {
        source: '/api/catalog/:path*',
        destination: `${backendUrl}/api/catalog/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;