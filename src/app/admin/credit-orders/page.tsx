"use client"

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Calendar,
  User,
  Building,
  MapPin,
  CreditCard,
  Package
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

// Removed useRole import - letting backend handle admin checks
import { useCredits } from '../../contexts/CreditContext';
import { cn } from '../../../lib/utils';
import { useApi } from '@/hooks/use-api';

interface CreditOrder {
  id: string;
  user_id: string;
  user_email: string;
  package_id: string;
  package_name: string;
  package_credits: number;
  package_price: number;
  school_name: string;
  purchaser_name: string;
  purchase_reference: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  is_active: boolean;
}

export default function CreditOrdersPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const api = useApi();
  const router = useRouter();
  // Removed useRole hook - letting backend handle admin checks
  const { refreshCredits, broadcastCreditUpdate } = useCredits();
  
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingOrder, setFulfillingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CreditOrder | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'fulfilled' | 'cancelled'>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');

  // Check authentication only (let backend handle admin check)
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Proactive token refresh to prevent expiration during long admin sessions
  useEffect(() => {
    if (!isSignedIn) return;
    
    // Refresh token every 3 minutes (before the 4-minute cache expires)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Proactively refreshing token...');
        await api.refreshToken();
        console.log('✅ Token refreshed proactively');
      } catch (error) {
        console.warn('⚠️ Failed to refresh token proactively:', error);
      }
    }, 3 * 60 * 1000); // 3 minutes
    
    return () => clearInterval(tokenRefreshInterval);
  }, [isSignedIn, api]);

  // Fetch orders and packages when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchOrders();
      fetchPackages();
    }
  }, [isSignedIn]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getAdminCreditOrders();
      
      if (error) {
        if (error.status === 403) {
          console.error('Access denied: Admin privileges required');
          alert('Je hebt geen toegang tot deze pagina. Admin rechten vereist.');
          router.push('/');
          return;
        }
        
        // Handle authentication errors specifically
        if (error.status === 401) {
          if (error.detail.includes('Signature has expired') || error.detail.includes('Invalid Clerk token')) {
            console.log('🔄 Token expired during orders fetch, attempting to refresh...');
            try {
              // Try to refresh the token
              await api.refreshToken();
              alert('Sessie verlengd, bestellingen worden opnieuw geladen.');
              // Retry the fetch with the new token
              const retryResult = await api.getAdminCreditOrders();
              if (retryResult.error) {
                throw new Error(`Failed to fetch orders after token refresh: ${retryResult.error.detail}`);
              }
              setOrders((retryResult.data as any).orders);
              return; // Successfully handled, exit early
            } catch (refreshError) {
              console.error('❌ Failed to refresh token during orders fetch:', refreshError);
              alert('Je sessie is verlopen. Log opnieuw in.');
              router.push('/');
              return;
            }
          } else {
            alert('Je bent niet geautoriseerd om bestellingen te bekijken.');
            router.push('/');
            return;
          }
        }
        
        console.error('Failed to fetch orders:', error);
        return;
      }

      setOrders((data as any).orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await api.getCreditPackages();
      
      if (error) {
        console.error('Error fetching packages:', error);
        setPackages([]);
        return;
      }

      // Backend returns packages directly as an array, not wrapped in an object
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]); // Set empty array on error to prevent undefined
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    setFulfillingOrder(orderId);
    try {
      const { error } = await api.fulfillCreditOrder(orderId, { 
        fulfilled_by: user?.id || '' 
      });

      if (error) {
        const errorMessage = error.detail || 'Failed to fulfill order';
        alert(`Fout bij het vervullen van de bestelling: ${errorMessage}`);
        return;
      }

      // Refresh orders and credits
      fetchOrders();
      await refreshCredits();
      
      // Find the order to get the user ID for broadcasting
      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Broadcast credit update to all components that need to know about it
        broadcastCreditUpdate(order.user_id);
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Er is een fout opgetreden bij het vervullen van de bestelling.');
    } finally {
      setFulfillingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Weet je zeker dat je deze bestelling wilt annuleren?')) {
      return;
    }

    try {
      const { error } = await api.updateOrderStatus(orderId, 'cancelled');

      if (error) {
        const errorMessage = error.detail || 'Failed to cancel order';
        alert(`Fout bij het annuleren van de bestelling: ${errorMessage}`);
        return;
      }

      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Er is een fout opgetreden bij het annuleren van de bestelling.');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In behandeling</Badge>;
      case 'fulfilled':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Vervuld</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Geannuleerd</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.purchaser_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.purchase_reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPackage = packageFilter === 'all' || order.package_id === packageFilter;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-examen-cyan" />
      </div>
    );
  }

  return (
          <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Bestellingen</h1>
          <p className="text-gray-600">Beheer credit bestellingen van gebruikers</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zoeken</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Email, school, koper..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="pending">In behandeling</SelectItem>
                  <SelectItem value="fulfilled">Vervuld</SelectItem>
                  <SelectItem value="cancelled">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pakket</label>
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle pakketten</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={fetchOrders}
                variant="outline"
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Vernieuwen
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
              <p className="text-gray-600">Bestellingen laden...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead>Pakket</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Koper</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-center">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{order.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{order.package_name}</div>
                              <div className="text-sm text-gray-500">
                                {order.package_credits} credits • {formatPrice(order.package_price)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span>{order.school_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span>{order.purchaser_name}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(order.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {order.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFulfillOrder(order.id)}
                                  disabled={fulfillingOrder === order.id}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  {fulfillingOrder === order.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredOrders.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Geen bestellingen gevonden
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bestelling Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Bestelling Informatie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Bestelling ID</label>
                      <p className="text-sm">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Datum</label>
                      <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    {selectedOrder.fulfilled_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Vervuld op</label>
                        <p className="text-sm">{formatDate(selectedOrder.fulfilled_at)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Package Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Pakket Informatie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pakket</label>
                      <p className="font-medium">{selectedOrder.package_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Credits</label>
                      <p className="font-medium">{selectedOrder.package_credits}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Prijs</label>
                      <p className="font-medium">{formatPrice(selectedOrder.package_price)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Klant Informatie
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{selectedOrder.user_email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">School</label>
                      <p className="text-sm">{selectedOrder.school_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Koper</label>
                      <p className="text-sm">{selectedOrder.purchaser_name}</p>
                    </div>
                    {selectedOrder.purchase_reference && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Referentie</label>
                        <p className="text-sm">{selectedOrder.purchase_reference}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Adres
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">{selectedOrder.address_line1}</p>
                    {selectedOrder.address_line2 && (
                      <p className="text-sm">{selectedOrder.address_line2}</p>
                    )}
                    <p className="text-sm">
                      {selectedOrder.postal_code} {selectedOrder.city}
                    </p>
                    <p className="text-sm">{selectedOrder.country}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDetailOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 