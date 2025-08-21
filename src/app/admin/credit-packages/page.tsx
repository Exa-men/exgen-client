"use client"

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Package,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';

import { cn } from '../../../lib/utils';
import { useApi } from '@/hooks/use-api';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreditPackageForm {
  name: string;
  credits: number;
  price: number;
  description: string;
  is_active: boolean;
}

export default function CreditPackagesPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const api = useApi();
  const router = useRouter();
  // Removed useRole hook - letting backend handle admin checks
  
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<CreditPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreditPackageForm>({
    name: '',
    credits: 0,
    price: 0,
    description: '',
    is_active: true
  });

  // Check authentication only (let backend handle admin check)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch packages when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchPackages();
    }
  }, [isSignedIn]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getAdminCreditPackages();
      
      if (error) {
        if (error.status === 403) {
          // console.error('Access denied: Admin privileges required');
          alert('Je hebt geen toegang tot deze pagina. Admin rechten vereist.');
          router.push('/');
          return;
        }
        // console.error('Failed to fetch packages:', error);
        return;
      }

      setPackages((data as any).packages || []);
    } catch (error) {
      // console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      credits: 0,
      price: 0,
      description: '',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleEditPackage = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price,
      description: pkg.description || '',
      is_active: pkg.is_active
    });
    setDialogOpen(true);
  };

  const handleDeletePackage = async (packageToDelete: CreditPackage) => {
    if (!confirm('Weet je zeker dat je dit pakket wilt verwijderen?')) {
      return;
    }

    try {
      setDeleting(packageToDelete.id);
      const { error } = await api.deleteAdminCreditPackage(packageToDelete.id);

      if (error) {
        throw new Error(error.detail || 'Failed to delete package');
      }

      // Remove from local state
      setPackages(prev => prev.filter(p => p.id !== packageToDelete.id));
      
      toast.success('Package deleted successfully');
    } catch (error) {
      // console.error('Error deleting package:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete package');
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.credits <= 0 || formData.price <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingPackage 
        ? `/api/v1/admin/credits/packages/${editingPackage.id}`
        : '/api/v1/admin/credits/packages';
      
      const method = editingPackage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await fetchPackages();
        setDialogOpen(false);
        setEditingPackage(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to save package');
      }
    } catch (error) {
      // console.error('Error saving package:', error);
      setError('Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return `€${(priceCents / 100).toFixed(2)}`;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading credit packages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Packages</h1>
          <p className="text-gray-600">Manage credit packages available for purchase</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-6">
          <Button onClick={handleCreatePackage} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>

        {/* Packages Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Credit Packages ({packages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pkg.name}</div>
                        {pkg.description && (
                          <div className="text-sm text-gray-500 mt-1">{pkg.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pkg.credits} credits</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(pkg.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.is_active ? "default" : "secondary"}>
                        {pkg.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(pkg.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(pkg.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePackage(pkg)}
                          disabled={deleting === pkg.id}
                        >
                          {deleting === pkg.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Credit Package' : 'Create Credit Package'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Starter, Professional, Enterprise"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credits">Credits *</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (cents) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    placeholder="2500"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {formData.price > 0 && `€${(formData.price / 100).toFixed(2)}`}
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package description..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (available for purchase)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  editingPackage ? 'Update Package' : 'Create Package'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Credit Package</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to delete the package "{packageToDelete?.name}"?
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleDeletePackage(packageToDelete!)}
                disabled={deleting === packageToDelete?.id}
              >
                {deleting === packageToDelete?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Package'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 