import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { RoleBadge } from './RoleBadge';
import { StatusBadge } from './StatusBadge';
import { UserPlus, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react';
// ✅ Importar TODAS las funciones directamente, sin el prefijo api.
import { getUsers, createUser, deleteUser, updateUser, resetPassword } from '../lib/api';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export function UserManagementScreen() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as 'admin' | 'doctor' | 'staff',
    password: ''
  });

  const handleCreateUser = async () => {
    setCreating(true);
    try {
      if (editingUserId) {
        // ✅ Usar updateUser directamente (sin api.)
        await updateUser(editingUserId, { 
          name: formData.name, 
          role: formData.role, 
          password: formData.password || undefined // Solo enviar si tiene valor
        });
      } else {
        // ✅ Usar createUser directamente (sin api.)
        await createUser({ 
          name: formData.name, 
          email: formData.email, 
          role: formData.role, 
          password: formData.password 
        });
      }
      // Refrescar lista
      const refreshed = await getUsers(); // ✅ Sin api.
      const list = refreshed.users || refreshed;
      setUsers(list);
      setIsCreateModalOpen(false);
      setEditingUserId(null);
      setFormData({ name: '', email: '', phone: '', role: 'staff', password: '' });
    } catch (err: any) {
      console.error('create user error', err);
      const msg = err?.body?.error || (err?.body ? JSON.stringify(err.body) : 'Could not create user');
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUserId(user.id);
    setFormData({ 
      name: user.name || '', 
      email: user.email || '', 
      phone: user.phone || '', 
      role: user.role || 'staff', 
      password: '' 
    });
    setIsCreateModalOpen(true);
  };

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Reset password for this user?')) return;
    try {
      // ✅ Usar resetPassword directamente importado de api.ts
      const res = await resetPassword(userId);
      const temp = res?.tempPassword || res?.temp || null;
      alert(`Temporary password: ${temp || 'Check console'}`);
      console.log('Reset password response:', res);
    } catch (err) {
      console.error('reset password error', err);
      alert('Could not reset password');
    }
  };

  useEffect(() => {
    setLoading(true);
    getUsers() // ✅ Sin api.
      .then((res) => {
        const list = res.users || res;
        setUsers(list);
      })
      .catch((err) => {
        console.error('fetch users error', err);
        alert('Could not fetch users. Make sure you are logged in as admin.');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleUserStatus = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const current = (user.status || '').toString().toLowerCase();
    const next = current === 'active' ? 'inactive' : 'active';
    
    setUpdatingStatus(s => ({ ...s, [userId]: true }));
    try {
      await updateUser(userId, { status: next }); // ✅ Sin api.
      setUsers(u => u.map(x => x.id === userId ? { ...x, status: next } : x));
    } catch (err) {
      console.error('update status error', err);
      alert('Could not update user status');
    } finally {
      setUpdatingStatus(s => ({ ...s, [userId]: false }));
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4 text-gray-600">
          Loading users...
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users ({filteredUsers.length})</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell className="text-gray-600">{user.phone || '-'}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={(user.status || '').toString().toLowerCase() === 'active'}
                          onCheckedChange={() => toggleUserStatus(user.id)}
                          disabled={!!updatingStatus[user.id]}
                        />
                        <StatusBadge status={user.status} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Reset password
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => {
                              if (!confirm('Delete this user?')) return;
                              deleteUser(user.id) // ✅ Sin api.
                                .then(() => setUsers(u => u.filter(x => x.id !== user.id)))
                                .catch(() => alert('Delete failed'));
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editingUserId ? 'Update user information' : 'Create a new user account for the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. John Doe"
              />
            </div>
            
            {/* Solo mostrar email si es nuevo usuario (en edición no se permite cambiar email) */}
            {!editingUserId && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@dentacare.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUserId ? 'New Password (leave blank to keep current)' : 'Password'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUserId ? '••••••••' : 'Enter password'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setEditingUserId(null);
              setFormData({ name: '', email: '', phone: '', role: 'staff', password: '' });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={creating}
            >
              {creating ? 'Saving...' : (editingUserId ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}