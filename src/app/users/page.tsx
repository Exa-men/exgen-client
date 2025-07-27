"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpDown, Crown, User, Edit, Loader2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { AdminOnly } from '../../components/RoleGuard';
import { cn } from '../../lib/utils';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'admin';
  credits: number;
  created_at: string;
}

interface UserListResponse {
  users: UserData[];
  total: number;
}

type SortField = 'first_name' | 'last_name' | 'email' | 'role' | 'credits' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchUsers = async () => {
    if (!isSignedIn) return;
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const response = await fetch('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data: UserListResponse = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      setUpdatingUser(userId);
      const token = await getToken();
      const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    } finally {
      setUpdatingUser(null);
    }
  };

  const updateUserCredits = async (userId: string, credits: number) => {
    try {
      setUpdatingUser(userId);
      const token = await getToken();
      const response = await fetch(`/api/v1/admin/users/${userId}/credits`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user credits');
      }

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, credits } : user
      ));
    } catch (err) {
      console.error('Error updating user credits:', err);
      setError('Failed to update user credits');
    } finally {
      setUpdatingUser(null);
    }
  };

  const updateUserEmail = async (userId: string, email: string) => {
    try {
      setUpdatingUser(userId);
      const token = await getToken();
      const response = await fetch(`/api/v1/admin/users/${userId}/email`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user email');
      }

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, email } : user
      ));
    } catch (err) {
      console.error('Error updating user email:', err);
      setError('Failed to update user email');
    } finally {
      setUpdatingUser(null);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [isSignedIn]);

  // Filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'credits') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, roleFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
          <div className="text-gray-600">Loading...</div>
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage user accounts, roles, and credits</p>
          </div>

          {/* Search Bar */}
          <div className="mb-10">
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-10 w-10" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-16 h-20 !text-3xl w-full shadow-lg border-2 border-examen-cyan focus:border-examen-cyan focus:ring-2 focus:ring-examen-cyan/30 transition-all"
              />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-row gap-4 mb-8 overflow-x-auto flex-nowrap">
            <button
              className={cn(
                'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
                roleFilter === 'all'
                  ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                  : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
              )}
              onClick={() => setRoleFilter('all')}
            >
              All Users
            </button>
            <button
              className={cn(
                'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
                roleFilter === 'user'
                  ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                  : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
              )}
              onClick={() => setRoleFilter('user')}
            >
              Regular Users
            </button>
            <button
              className={cn(
                'rounded-full px-8 py-3 text-lg font-semibold border transition-all',
                roleFilter === 'admin'
                  ? 'bg-examen-cyan text-white border-examen-cyan shadow'
                  : 'bg-white text-gray-700 border-examen-cyan hover:bg-examen-cyan/10'
              )}
              onClick={() => setRoleFilter('admin')}
            >
              Administrators
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-examen-cyan" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('first_name')}
                            className="h-auto p-0 font-semibold"
                          >
                            First Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('last_name')}
                            className="h-auto p-0 font-semibold"
                          >
                            Last Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('email')}
                            className="h-auto p-0 font-semibold"
                          >
                            Email
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('role')}
                            className="h-auto p-0 font-semibold"
                          >
                            Role
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('credits')}
                            className="h-auto p-0 font-semibold"
                          >
                            Credits
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('created_at')}
                            className="h-auto p-0 font-semibold"
                          >
                            Joined
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No users found for your search.' : 'No users available.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedUsers.map((userData) => (
                          <TableRow key={userData.id}>
                            <TableCell className="font-medium">
                              {userData.first_name}
                            </TableCell>
                            <TableCell className="font-medium">
                              {userData.last_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span>{userData.email}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newEmail = prompt(`Enter new email for ${userData.first_name} ${userData.last_name}:`, userData.email);
                                    if (newEmail && newEmail.includes('@')) {
                                      updateUserEmail(userData.id, newEmail);
                                    }
                                  }}
                                  disabled={updatingUser === userData.id}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {userData.role === 'admin' ? (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <User className="h-4 w-4 text-gray-500" />
                                )}
                                <Badge variant={userData.role === 'admin' ? 'default' : 'secondary'}>
                                  {userData.role}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{userData.credits}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newCredits = prompt(`Enter new credits for ${userData.first_name} ${userData.last_name}:`, userData.credits.toString());
                                    if (newCredits && !isNaN(Number(newCredits))) {
                                      updateUserCredits(userData.id, Number(newCredits));
                                    }
                                  }}
                                  disabled={updatingUser === userData.id}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(userData.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Select
                                value={userData.role}
                                onValueChange={(value: 'user' | 'admin') => updateUserRole(userData.id, value)}
                                disabled={updatingUser === userData.id}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  );
} 