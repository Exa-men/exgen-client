"use client"

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  CreditCard,
  Copy,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

import { useCredits } from '../../contexts/CreditContext';
import { cn } from '../../../lib/utils';

interface Voucher {
  id: string;
  code: string;
  credits: number;
  expires_at: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_by: string;
  created_at: string;
  user_who_used_name?: string;
  admin_who_created_name: string;
}

export default function VouchersPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  // Removed useRole hook - letting backend handle admin checks
  
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<string | null>(null);
  const [updatingVoucher, setUpdatingVoucher] = useState<string | null>(null);

  // Form states
  const [newVoucherCredits, setNewVoucherCredits] = useState(10);
  const [newVoucherExpiresAt, setNewVoucherExpiresAt] = useState('');
  const [editVoucherCredits, setEditVoucherCredits] = useState(10);
  const [editVoucherExpiresAt, setEditVoucherExpiresAt] = useState('');

  // Check authentication only (let backend handle admin check)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Set default expiration date (10 days from now)
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 10);
    setNewVoucherExpiresAt(defaultDate.toISOString().split('T')[0]);
  }, []);

  // Fetch vouchers when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchVouchers();
    }
  }, [isSignedIn]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/vouchers', {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVouchers(data.vouchers);
      } else if (response.status === 403) {
        console.error('Access denied: Admin privileges required');
        alert('Je hebt geen toegang tot deze pagina. Admin rechten vereist.');
        router.push('/');
      } else {
        console.error('Failed to fetch vouchers');
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoucher = async () => {
    try {
      const response = await fetch('/api/v1/admin/vouchers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credits: newVoucherCredits,
          expires_at: new Date(newVoucherExpiresAt).toISOString()
        })
      });

      if (response.ok) {
        const newVoucher = await response.json();
        setVouchers(prev => [newVoucher, ...prev]);
        setCreateDialogOpen(false);
        setNewVoucherCredits(10);
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 10);
        setNewVoucherExpiresAt(defaultDate.toISOString().split('T')[0]);
      } else {
        const error = await response.json();
        alert(`Fout bij het aanmaken van voucher: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      alert('Er is een fout opgetreden bij het aanmaken van de voucher.');
    }
  };

  const handleEditVoucher = async () => {
    if (!selectedVoucher) return;
    
    setUpdatingVoucher(selectedVoucher.id);
    try {
      const response = await fetch(`/api/v1/admin/vouchers/${selectedVoucher.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credits: editVoucherCredits,
          expires_at: new Date(editVoucherExpiresAt).toISOString()
        })
      });

      if (response.ok) {
        const updatedVoucher = await response.json();
        setVouchers(prev => prev.map(v => v.id === selectedVoucher.id ? updatedVoucher : v));
        setEditDialogOpen(false);
        setSelectedVoucher(null);
      } else {
        const error = await response.json();
        alert(`Fout bij het bijwerken van voucher: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error updating voucher:', error);
      alert('Er is een fout opgetreden bij het bijwerken van de voucher.');
    } finally {
      setUpdatingVoucher(null);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    setDeletingVoucher(voucherId);
    try {
      const response = await fetch(`/api/v1/admin/vouchers/${voucherId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });

      if (response.ok) {
        setVouchers(prev => prev.filter(v => v.id !== voucherId));
      } else {
        const error = await response.json();
        alert(`Fout bij het verwijderen van voucher: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Er is een fout opgetreden bij het verwijderen van de voucher.');
    } finally {
      setDeletingVoucher(null);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const openEditDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setEditVoucherCredits(voucher.credits);
    setEditVoucherExpiresAt(voucher.expires_at.split('T')[0]);
    setEditDialogOpen(true);
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

  const getStatusBadge = (isUsed: boolean, expiresAt: string) => {
    if (isUsed) {
      return <Badge variant="secondary">Gebruikt</Badge>;
    }
    
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired) {
      return <Badge variant="destructive">Verlopen</Badge>;
    }
    
    return <Badge variant="default">Beschikbaar</Badge>;
  };

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voucher.admin_who_created_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (voucher.user_who_used_name && voucher.user_who_used_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'unused' && !voucher.is_used) ||
                         (statusFilter === 'used' && voucher.is_used);
    
    return matchesSearch && matchesStatus;
  });

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Voucher Beheer</h1>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe Voucher
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Zoek op code, admin of gebruiker..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'unused' | 'used') => setStatusFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Vouchers</SelectItem>
                  <SelectItem value="unused">Beschikbaar</SelectItem>
                  <SelectItem value="used">Gebruikt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Vouchers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vouchers ({filteredVouchers.length})</CardTitle>
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
                    <TableHead>Code</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verloopt</TableHead>
                    <TableHead>Aangemaakt door</TableHead>
                    <TableHead>Gebruikt door</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {voucher.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(voucher.code)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedCode === voucher.code ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          {voucher.credits}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(voucher.is_used, voucher.expires_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatDate(voucher.expires_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          {voucher.admin_who_created_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {voucher.user_who_used_name ? (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-green-600" />
                            {voucher.user_who_used_name}
                            <span className="text-xs text-gray-500">
                              {formatDate(voucher.used_at!)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!voucher.is_used && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(voucher)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVoucher(voucher.id)}
                                disabled={deletingVoucher === voucher.id}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                {deletingVoucher === voucher.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Voucher Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Voucher Aanmaken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credits">Aantal Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                value={newVoucherCredits}
                onChange={(e) => setNewVoucherCredits(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="expiresAt">Verloopt op</Label>
              <Input
                id="expiresAt"
                type="date"
                value={newVoucherExpiresAt}
                onChange={(e) => setNewVoucherExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateVoucher}>
              Voucher Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Voucher Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voucher Bewerken</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editCredits">Aantal Credits</Label>
              <Input
                id="editCredits"
                type="number"
                min="1"
                value={editVoucherCredits}
                onChange={(e) => setEditVoucherCredits(parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label htmlFor="editExpiresAt">Verloopt op</Label>
              <Input
                id="editExpiresAt"
                type="date"
                value={editVoucherExpiresAt}
                onChange={(e) => setEditVoucherExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={handleEditVoucher}
              disabled={updatingVoucher === selectedVoucher?.id}
            >
              {updatingVoucher === selectedVoucher?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Bijwerken...
                </>
              ) : (
                'Bijwerken'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 