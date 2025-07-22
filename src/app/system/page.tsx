"use client";

import { AdminOnly } from '../../components/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Settings, RefreshCw, Database, FileText } from 'lucide-react';
import UnifiedHeader from '../components/UnifiedHeader';

export default function SystemPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const performAction = async (action: string, endpoint: string) => {
    setLoading(true);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const response = await fetch(`/api/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({ type: 'success', message: data.message || 'Action completed successfully' });
      } else {
        setStatus({ type: 'error', message: 'Action failed' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = async () => {
    setLoading(true);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const response = await fetch('/api/v1/config/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({ type: 'info', message: JSON.stringify(data, null, 2) });
      } else {
        setStatus({ type: 'error', message: 'Failed to get configuration status' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-gray-50">
        <UnifiedHeader />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Management</h1>
            <p className="text-gray-600">Manage system configuration, defaults, and settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuration Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <CardTitle>Configuration Management</CardTitle>
                </div>
                <CardDescription>
                  Manage system configuration and defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button
                    onClick={() => performAction('migrate', 'config/migrate-defaults')}
                    disabled={loading}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Migrate Defaults
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Migrate default prompts from code space to user space
                  </p>
                </div>
                
                <div>
                  <Button
                    onClick={() => performAction('reset', 'config/reset-to-defaults')}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Reset user configuration to system defaults
                  </p>
                </div>

                <div>
                  <Button
                    onClick={getConfigStatus}
                    disabled={loading}
                    variant="secondary"
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    View current configuration status
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status Display */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>
                  Current system status and recent actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : status ? (
                  <div className="space-y-2">
                    <Badge variant={status.type === 'success' ? 'default' : status.type === 'error' ? 'destructive' : 'secondary'}>
                      {status.type.toUpperCase()}
                    </Badge>
                    <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-64">
                      {status.message}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No recent actions</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Current system details and environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Environment</h4>
                  <p className="text-sm text-gray-600">Production</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Version</h4>
                  <p className="text-sm text-gray-600">1.0.0</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Database</h4>
                  <p className="text-sm text-gray-600">PostgreSQL</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Authentication</h4>
                  <p className="text-sm text-gray-600">Clerk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminOnly>
  );
} 