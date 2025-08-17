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
import { toast } from 'sonner';

import { AdminOnly } from '../../components/RoleGuard';
import { cn } from '../../lib/utils';
import { useApi } from '@/hooks/use-api';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'admin';
  credits: number;
  school_name: string | null;
  department: string | null;
  created_at: string;
}

interface UserListResponse {
  users: UserData[];
  total: number;
}

type SortField = 'first_name' | 'last_name' | 'email' | 'role' | 'credits' | 'school_name' | 'department' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const api = useApi();
  const router = useRouter();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('first_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingCredits, setUpdatingCredits] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);
  const [updatingSchool, setUpdatingSchool] = useState<string | null>(null);
  const [welcomeVoucherStats, setWelcomeVoucherStats] = useState({
    total_users: 0,
    activated_welcome_vouchers: 0,
    activation_rate: 0
  });

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch data when component mounts
  useEffect(() => {
    if (isSignedIn) {
      fetchUsers();
      fetchWelcomeVoucherStats();
    }
  }, [isSignedIn]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getAdminUsers();
      
      if (error) {
        if (error.status === 403) {
          console.error('Access denied: Admin privileges required');
          alert('Je hebt geen toegang tot deze pagina. Admin rechten vereist.');
          router.push('/');
          return;
        }
        console.error('Failed to fetch users:', error);
        return;
      }

      setUsers((data as any).users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWelcomeVoucherStats = async () => {
    try {
      const { data, error } = await api.getWelcomeVoucherStats();
      
      if (error) {
        console.error('Error fetching welcome voucher stats:', error);
        return;
      }

      setWelcomeVoucherStats(data as any);
    } catch (error) {
      console.error('Error fetching welcome voucher stats:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingRole(userId);
      const { error } = await api.updateUserRole(userId, newRole);

      if (error) {
        throw new Error(error.detail || 'Failed to update user role');
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole as 'user' | 'admin' } : user
      ));
      
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleCreditsChange = async (userId: string, newCredits: number) => {
    try {
      setUpdatingCredits(userId);
      const { error } = await api.updateUserCredits(userId, newCredits);

      if (error) {
        throw new Error(error.detail || 'Failed to update user credits');
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, credits: newCredits } : user
      ));
      
      toast.success('User credits updated successfully');
    } catch (error) {
      console.error('Error updating user credits:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user credits');
    } finally {
      setUpdatingCredits(null);
    }
  };

  const handleEmailChange = async (userId: string, newEmail: string) => {
    try {
      setUpdatingEmail(userId);
      const { error } = await api.updateUserEmail(userId, newEmail);

      if (error) {
        throw new Error(error.detail || 'Failed to update user email');
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, email: newEmail } : user
      ));
      
      toast.success('User email updated successfully');
    } catch (error) {
      console.error('Error updating user email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user email');
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleSchoolChange = async (userId: string, newSchool: string) => {
    try {
      setUpdatingSchool(userId);
      const { error } = await api.updateUserSchool(userId, newSchool);

      if (error) {
        throw new Error(error.detail || 'Failed to update user school');
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, school_name: newSchool } : user
      ));
      
      toast.success('User school updated successfully');
    } catch (error) {
      console.error('Error updating user school:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user school');
    } finally {
      setUpdatingSchool(null);
    }
  };

  const updateUserDepartment = async (userId: string, department: string) => {
    try {
      setUpdatingUser(userId);
      const { error } = await api.updateUserDepartment(userId, department);

      if (error) {
        throw new Error(error.detail || 'Failed to update user department');
      }

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, department } : user
      ));
      toast.success('User department updated successfully');
    } catch (err) {
      console.error('Error updating user department:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update user department');
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
      const matchesSearch = 
        (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.school_name && user.school_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle null values for school_name and department
      if (sortField === 'school_name' || sortField === 'department') {
        aValue = aValue || '';
        bValue = bValue || '';
      }
      
      if (sortField === 'credits') {
        aValue = Number(aValue || 0);
        bValue = Number(bValue || 0);
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
                placeholder="Search by name, email, school, or department..."
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

          {/* Statistics Section */}
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-examen-cyan">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-6 w-6 text-examen-cyan" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  </div>
                </div>
              </div>

              {/* Admin Users */}
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Crown className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Administrators</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(user => user.role === 'admin').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Regular Users */}
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Regular Users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {users.filter(user => user.role === 'user').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Credits */}
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">€</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Credits</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {users.reduce((total, user) => total + user.credits, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Welcome Vouchers Activated */}
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">🎁</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Welcome Vouchers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {welcomeVoucherStats.activated_welcome_vouchers || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                            onClick={() => handleSort('school_name')}
                            className="h-auto p-0 font-semibold"
                          >
                            School
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('department')}
                            className="h-auto p-0 font-semibold"
                          >
                            Department
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

                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
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
                                      handleEmailChange(userData.id, newEmail);
                                    }
                                  }}
                                  disabled={updatingEmail === userData.id}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Select
                                  value={userData.role}
                                  onValueChange={(value: 'user' | 'admin') => handleRoleChange(userData.id, value)}
                                  disabled={updatingRole === userData.id}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">
                                      <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span>User</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      <div className="flex items-center space-x-2">
                                        <Crown className="h-4 w-4 text-yellow-500" />
                                        <span>Admin</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
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
                                      handleCreditsChange(userData.id, Number(newCredits));
                                    }
                                  }}
                                  disabled={updatingCredits === userData.id}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className={userData.school_name ? '' : 'text-gray-400 italic'}>
                                  {userData.school_name || 'N/a'}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newSchool = prompt(`Enter school name for ${userData.first_name} ${userData.last_name}:`, userData.school_name || '');
                                    if (newSchool !== null) {
                                      handleSchoolChange(userData.id, newSchool);
                                    }
                                  }}
                                  disabled={updatingSchool === userData.id}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className={userData.department ? '' : 'text-gray-400 italic'}>
                                  {userData.department || 'N/a'}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newDepartment = prompt(`Enter department for ${userData.first_name} ${userData.last_name}:`, userData.department || '');
                                    if (newDepartment !== null) {
                                      updateUserDepartment(userData.id, newDepartment);
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