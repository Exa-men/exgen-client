"use client";

import { useUser, useAuth } from '@clerk/nextjs';
import { AdminOnly } from '../../components/RoleGuard';

export default function AgentsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading authentication...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect
  }

  return (
    <AdminOnly
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      }
    >
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title and subtitle */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agents</h1>
            <p className="text-gray-600">AI-powered agents for document processing and analysis</p>
          </div>
          
          {/* Empty state - ready for future langchain implementation */}
          <div className="bg-white rounded-lg p-12 shadow-sm text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Agents Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              This page will be populated with langchain-powered agents for intelligent document processing.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
              Under Development
            </div>
          </div>
        </div>
      </main>
    </AdminOnly>
  );
} 