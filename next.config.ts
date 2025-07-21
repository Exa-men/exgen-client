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
  },
  async rewrites() {
    return [
      {
        source: '/api/catalog/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://exgen-production.up.railway.app'}/api/catalog/:path*`,
      },
    ];
  },
};

export default nextConfig;