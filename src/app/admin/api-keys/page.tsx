"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Copy, Plus, Trash2, Eye, EyeOff, Key, Activity } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  third_party_name: string;
  is_active: boolean;
  rate_limit_frequency: string;
  created_at: string;
  last_used: string | null;
}

interface CreateApiKeyResponse {
  id: string;
  api_key: string;
  third_party_name: string;
  rate_limit_frequency: string;
  created_at: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newApiKey, setNewApiKey] = useState({
    third_party_name: ''
  });
  
  // Newly created API key (to show once)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Delete dialog state
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/api-keys', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.api_keys);
      } else if (response.status === 403) {
        console.error('Access denied: Admin privileges required');
        alert('Je hebt geen toegang tot deze pagina. Admin rechten vereist.');
        router.push('/');
      } else {
        console.error('Failed to fetch API keys');
        setError('Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Error fetching API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newApiKey.third_party_name.trim()) {
      toast.error('Please enter a third-party name');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/v1/admin/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          third_party_name: newApiKey.third_party_name,
          rate_limit_frequency: 'daily' // Fixed rate limit
        })
      });

      if (response.ok) {
        const createdKey = await response.json();
        setNewlyCreatedKey(createdKey);
        setApiKeys(prev => [{
          id: createdKey.id,
          third_party_name: createdKey.third_party_name,
          is_active: true,
          rate_limit_frequency: createdKey.rate_limit_frequency,
          created_at: createdKey.created_at,
          last_used: null
        }, ...prev]);
        setCreateDialogOpen(false);
        setNewApiKey({ third_party_name: '' });
        toast.success('API key created successfully');
      } else {
        const error = await response.json();
        toast.error(`Error creating API key: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Error creating API key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleApiKey = async (apiKey: ApiKey) => {
    try {
      const response = await fetch(`/api/v1/admin/api-keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !apiKey.is_active
        })
      });

      if (response.ok) {
        setApiKeys(prev => prev.map(key => 
          key.id === apiKey.id 
            ? { ...key, is_active: !key.is_active }
            : key
        ));
        toast.success(`API key ${!apiKey.is_active ? 'activated' : 'deactivated'} successfully`);
      } else {
        const error = await response.json();
        toast.error(`Error updating API key: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Error updating API key');
    }
  };

  const handleDeleteApiKey = async () => {
    if (!deleteKey) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/admin/api-keys/${deleteKey.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== deleteKey.id));
        setDeleteKey(null);
        toast.success('API key deleted successfully');
      } else {
        const error = await response.json();
        toast.error(`Error deleting API key: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Error deleting API key');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-examen-cyan mx-auto mb-4"></div>
            <p className="text-gray-600">Loading API keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-2">Manage API keys for third-party integrations</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-examen-cyan hover:bg-examen-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for third-party platform integration. 
                All API keys use fixed rate limits optimized for your platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="third-party-name">Third-Party Name</Label>
                <Input
                  id="third-party-name"
                  placeholder="e.g., School Platform XYZ"
                  value={newApiKey.third_party_name}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, third_party_name: e.target.value }))}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Rate Limits</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Browse Catalog: 1,000/hour, 10,000/day</p>
                  <p>• Check Updates: 500/hour, 5,000/day</p>
                  <p>• Get Documents: 200/hour, 2,000/day</p>
                  <p>• Download PDFs: 100/hour, 1,000/day</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateApiKey} 
                disabled={creating || !newApiKey.third_party_name.trim()}
                className="bg-examen-cyan hover:bg-examen-cyan-600"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first API key for third-party integration.</p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-examen-cyan hover:bg-examen-cyan-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {apiKey.third_party_name}
                      <Badge variant={apiKey.is_active ? "default" : "secondary"}>
                        {apiKey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {formatDate(apiKey.created_at)}
                      {apiKey.last_used && (
                        <span className="ml-4">
                          Last used {formatDate(apiKey.last_used)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleApiKey(apiKey)}
                    >
                      {apiKey.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteKey(apiKey)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the API key for "{apiKey.third_party_name}"? 
                            This action cannot be undone and will immediately revoke access for the third-party platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteApiKey}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Newly Created API Key Dialog */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Key Created Successfully
            </DialogTitle>
            <DialogDescription>
              Your new API key has been created. Copy it now as it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Third-Party Name</Label>
              <p className="text-sm font-medium">{newlyCreatedKey?.third_party_name}</p>
            </div>
            <div>
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={newlyCreatedKey?.api_key || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newlyCreatedKey?.api_key || '')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This API key will only be shown once. 
                Make sure to copy it and share it securely with the third-party platform.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setNewlyCreatedKey(null)}
              className="bg-examen-cyan hover:bg-examen-cyan-600"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 