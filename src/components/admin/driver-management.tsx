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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, Search, Shield, MoreHorizontal, Eye, Trash2 } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';
import type { Driver } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function DriverManagement() {
  const { drivers, setDrivers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      setDrivers(data.drivers);
    } catch (err) {
      console.error('Failed to load drivers:', err);
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDrivers(); }, []);

  const handleVerify = async (driverId: string, userId: string, verified: boolean) => {
    try {
      await fetch('/api/drivers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverId, verified }),
      });
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: verified ? 'ACTIVE' : 'SUSPENDED' }),
      });
      toast.success(verified ? 'Driver approved successfully' : 'Driver suspended');
      loadDrivers();
    } catch {
      toast.error('Failed to update driver');
    }
  };

  const filtered = (drivers || []).filter((d) => {
    const name = d.user?.name?.toLowerCase() || '';
    const email = d.user?.email?.toLowerCase() || '';
    const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || d.vehicleType === filterType;
    const matchStatus = filterStatus === 'ALL' ||
      (filterStatus === 'VERIFIED' && d.verified) ||
      (filterStatus === 'PENDING' && !d.verified) ||
      (filterStatus === 'ONLINE' && d.online);
    return matchSearch && matchType && matchStatus;
  });

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Driver Management</h1>
        <p className="text-sm text-muted-foreground">Manage and verify emergency vehicle drivers</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(VEHICLE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Verifications Alert */}
      {drivers?.some((d) => !d.verified) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            {drivers.filter((d) => !d.verified).length} driver(s) pending verification
          </span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {filtered.map((driver) => {
              const vtConfig = VEHICLE_TYPE_CONFIG[driver.vehicleType];
              return (
                <div key={driver.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="text-xl">{vtConfig.emoji}</span>
                        {driver.online && <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{driver.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.vehicleNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {driver.verified ? (
                        <Badge variant="outline" className="border-green-500 text-green-600 text-[10px]">Verified</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">Pending</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">{driver.user?.email}</p>
                    {!driver.verified && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleVerify(driver.id, driver.userId, true)}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Online</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((driver) => {
                const vtConfig = VEHICLE_TYPE_CONFIG[driver.vehicleType];
                return (
                  <TableRow key={driver.id} className={!driver.verified ? 'bg-yellow-500/5' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                            {driver.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          {driver.online && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{driver.user?.name}</p>
                          <p className="text-xs text-muted-foreground">{driver.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{driver.vehicleNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {vtConfig.emoji} {vtConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{driver.licenseNumber}</TableCell>
                    <TableCell>
                      {driver.verified ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">Verified</Badge>
                      ) : (
                        <Badge variant="destructive">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={driver.online ? 'outline' : 'secondary'} className={driver.online ? 'border-green-500 text-green-600' : ''}>
                        {driver.online ? 'Online' : 'Offline'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedDriver(driver)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {!driver.verified && (
                            <DropdownMenuItem onClick={() => handleVerify(driver.id, driver.userId, true)} className="text-green-600">
                              <Check className="h-4 w-4 mr-2" /> Approve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleVerify(driver.id, driver.userId, false)} className="text-red-600">
                            <X className="h-4 w-4 mr-2" /> {driver.verified ? 'Suspend' : 'Reject'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No drivers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Driver Detail Dialog */}
      <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedDriver.user?.name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedDriver.user?.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedDriver.user?.phone || 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{selectedDriver.vehicleNumber}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{VEHICLE_TYPE_CONFIG[selectedDriver.vehicleType].emoji} {VEHICLE_TYPE_CONFIG[selectedDriver.vehicleType].label}</span></div>
                <div><span className="text-muted-foreground">License:</span> <span className="font-medium">{selectedDriver.licenseNumber}</span></div>
                <div><span className="text-muted-foreground">Verified:</span> <Badge variant={selectedDriver.verified ? 'outline' : 'destructive'}>{selectedDriver.verified ? 'Yes' : 'No'}</Badge></div>
                <div><span className="text-muted-foreground">Online:</span> <Badge variant={selectedDriver.online ? 'outline' : 'secondary'}>{selectedDriver.online ? 'Yes' : 'No'}</Badge></div>
              </div>
              {selectedDriver.currentLatitude && selectedDriver.currentLongitude && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Last Location:</span>{' '}
                  <span className="font-medium">{selectedDriver.currentLatitude.toFixed(4)}, {selectedDriver.currentLongitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDriver(null)}>Close</Button>
            {selectedDriver && !selectedDriver.verified && (
              <Button onClick={() => handleVerify(selectedDriver.id, selectedDriver.userId, true)}>
                <Check className="h-4 w-4 mr-1" /> Approve Driver
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
