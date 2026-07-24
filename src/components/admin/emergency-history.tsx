'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, MapPin, Gauge, Navigation } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG, EMERGENCY_STATUS_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';

export function EmergencyHistory() {
  const { activeEmergencies, setActiveEmergencies } = useAppStore();
  const [allEmergencies, setAllEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  const loadEmergencies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergencies');
      const data = await res.json();
      setAllEmergencies(data.emergencies);
      setActiveEmergencies(data.emergencies.filter((e: Emergency) => e.status === 'ACTIVE'));
    } catch {
      toast.error('Failed to load emergencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmergencies(); }, []);

  const filtered = allEmergencies.filter((e) => {
    const matchStatus = filterStatus === 'ALL' || e.status === filterStatus;
    const matchType = filterType === 'ALL' || e.vehicleType === filterType;
    return matchStatus && matchType;
  });

  const formatETA = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emergency History</h1>
          <p className="text-sm text-muted-foreground">Track and review all emergency responses</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {Object.entries(VEHICLE_TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {filtered.map((emergency) => {
              const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
              const stConfig = EMERGENCY_STATUS_CONFIG[emergency.status];
              return (
                <div key={emergency.id} className={`border rounded-lg p-3 space-y-2 ${emergency.status === 'ACTIVE' ? 'emergency-flash border-destructive/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{vtConfig.emoji}</span>
                      <div>
                        <p className="font-medium text-sm">{emergency.destinationName}</p>
                        <p className="text-xs text-muted-foreground">{emergency.driver?.user?.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={stConfig.color}>{stConfig.label}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground"><Gauge className="h-3 w-3" />{emergency.speed ? `${emergency.speed} km/h` : '—'}</div>
                    <div className="flex items-center gap-1 text-muted-foreground"><Navigation className="h-3 w-3" />{emergency.distanceRemaining ? `${emergency.distanceRemaining.toFixed(1)} km` : '—'}</div>
                    <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{formatETA(emergency.eta)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Started {formatDistanceToNow(new Date(emergency.startedAt), { addSuffix: true })}</p>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((emergency) => {
                const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
                const stConfig = EMERGENCY_STATUS_CONFIG[emergency.status];
                return (
                  <TableRow key={emergency.id} className={emergency.status === 'ACTIVE' ? 'emergency-flash' : ''}>
                    <TableCell>
                      <Badge variant="outline">{vtConfig.emoji} {vtConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{emergency.driver?.user?.name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{emergency.destinationName}</div>
                    </TableCell>
                    <TableCell className="text-sm">{emergency.speed ? `${emergency.speed} km/h` : '—'}</TableCell>
                    <TableCell className="text-sm">{emergency.distanceRemaining ? `${emergency.distanceRemaining.toFixed(1)} km` : '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{formatETA(emergency.eta)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={stConfig.color}>{stConfig.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(emergency.startedAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No emergencies found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
