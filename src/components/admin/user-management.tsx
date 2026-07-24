'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserCog, ShieldAlert, ShieldCheck, Trash2, MoreHorizontal } from 'lucide-react';
import { ROLE_CONFIG } from '@/lib/constants';
import type { User } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId, status: newStatus }) });
      toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
      loadUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: userId }) });
      toast.success('User deleted');
      loadUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const filtered = users.filter((u) => {
    const name = u.name?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage all system users</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="DRIVER">Driver</SelectItem>
            <SelectItem value="PUBLIC">Public</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="md:hidden p-4 space-y-3">
            {filtered.map((user) => (
              <div key={user.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={ROLE_CONFIG[user.role].color}>{ROLE_CONFIG[user.role].label}</Badge>
                  <Badge variant={user.status === 'ACTIVE' ? 'outline' : 'secondary'}>{user.status}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_CONFIG[user.role].color}>{ROLE_CONFIG[user.role].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'outline' : user.status === 'SUSPENDED' ? 'destructive' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === 'ACTIVE' ? (
                          <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'SUSPENDED')} className="text-orange-600">
                            <ShieldAlert className="h-4 w-4 mr-2" /> Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'ACTIVE')} className="text-green-600">
                            <ShieldCheck className="h-4 w-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
