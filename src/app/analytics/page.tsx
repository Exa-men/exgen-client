"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { AdminOnly } from '../../components/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart3, Users, FileText, Activity, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/');
      return;
    }
    // ... existing analytics logic ...
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
          {/* ... existing analytics content ... */}
        </div>
      </div>
    </div>
  );
} 