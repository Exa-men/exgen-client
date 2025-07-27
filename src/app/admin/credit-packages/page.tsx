"use client"

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CreditCard,
  Package,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useRole } from '../../../hooks/use-role';

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

export default function CreditPackagesPage() {
  console.log('Credit packages page component loaded');
  
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { userRole, isLoading: roleLoading, hasOwnerAccess } = useRole();
  
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<string | null>(null);
  const [updatingPackage, setUpdatingPackage] = useState<string | null>(null);

  // Form states
  const [newPackage, setNewPackage] = useState({
    name: '',
    credits: 10,
    price: 1000, // in cents
    description: '',
    is_active: true
  });
  const [editPackage, setEditPackage] = useState({
    name: '',
    credits: 10,
    price: 1000,
    description: '',
    is_active: true
  });

  // Check authentication and owner role
  useEffect(() => {
    console.log('Credit packages page auth check:', { isLoaded, isSignedIn, roleLoading, hasOwnerAccess, userRole });
    
    if (isLoaded && !isSignedIn) {
      console.log('Redirecting: User not signed in');
      router.push('/');
      return;
    }
    
    // Only redirect if we're fully loaded and the user is definitely not authorized
    if (isLoaded && !roleLoading && userRole.role !== null && !hasOwnerAccess) {
      console.log('Redirecting: User not owner');
      router.push('/');
      return;
    }
  }, [isLoaded, isSignedIn, roleLoading, hasOwnerAccess, userRole, router]);

  // Fetch packages
  useEffect(() => {
    if (hasOwnerAccess) {
      fetchPackages();
    }
  }, [hasOwnerAccess]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/credits/packages', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages);
      } else {
        console.error('Failed to fetch credit packages');
      }
    } catch (error) {
      console.error('Error fetching credit packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    try {
      const response = await fetch('/api/v1/admin/credits/packages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPackage)
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewPackage({
          name: '',
          credits: 10,
          price: 1000,
          description: '',
          is_active: true
        });
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Error creating package: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('An error occurred while creating the package.');
    }
  };

  const handleEditPackage = async () => {
    if (!selectedPackage) return;
    
    setUpdatingPackage(selectedPackage.id);
    try {
      const response = await fetch(`/api/v1/admin/credits/packages/${selectedPackage.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editPackage)
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setSelectedPackage(null);
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Error updating package: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('An error occurred while updating the package.');
    } finally {
      setUpdatingPackage(null);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this credit package? This action cannot be undone.')) {
      return;
    }

    setDeletingPackage(packageId);
    try {
      const response = await fetch(`/api/v1/admin/credits/packages/${packageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });

      if (response.ok) {
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Error deleting package: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('An error occurred while deleting the package.');
    } finally {
      setDeletingPackage(null);
    }
  };

  const openEditDialog = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setEditPackage({
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price,
      description: pkg.description,
      is_active: pkg.is_active
    });
    setEditDialogOpen(true);
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

  // Filter packages
  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (!isLoaded || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!hasOwnerAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Credit Package Management</h1>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Package
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Packages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Packages ({filteredPackages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No credit packages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-gray-500">{pkg.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            {pkg.credits}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-green-600" />
                            {formatPrice(pkg.price)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pkg.is_active ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(pkg.created_at)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(pkg)}
                              disabled={updatingPackage === pkg.id}
                            >
                              {updatingPackage === pkg.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePackage(pkg.id)}
                              disabled={deletingPackage === pkg.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              {deletingPackage === pkg.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Package Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Credit Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                placeholder="e.g., Basic Package"
              />
            </div>
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                value={newPackage.credits}
                onChange={(e) => setNewPackage({ ...newPackage, credits: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (in cents)</Label>
              <Input
                id="price"
                type="number"
                value={newPackage.price}
                onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                min={0}
                step={100}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formatPrice(newPackage.price)} total
              </p>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newPackage.description}
                onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                placeholder="Package description..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={newPackage.is_active}
                onCheckedChange={(checked) => setNewPackage({ ...newPackage, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePackage}>
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editPackage.name}
                onChange={(e) => setEditPackage({ ...editPackage, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-credits">Credits</Label>
              <Input
                id="edit-credits"
                type="number"
                value={editPackage.credits}
                onChange={(e) => setEditPackage({ ...editPackage, credits: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (in cents)</Label>
              <Input
                id="edit-price"
                type="number"
                value={editPackage.price}
                onChange={(e) => setEditPackage({ ...editPackage, price: Number(e.target.value) })}
                min={0}
                step={100}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formatPrice(editPackage.price)} total
              </p>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editPackage.description}
                onChange={(e) => setEditPackage({ ...editPackage, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={editPackage.is_active}
                onCheckedChange={(checked) => setEditPackage({ ...editPackage, is_active: checked })}
              />
              <Label htmlFor="edit-is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditPackage} disabled={updatingPackage !== null}>
              {updatingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 