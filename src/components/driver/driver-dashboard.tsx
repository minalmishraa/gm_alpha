'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Navigation, MapPin, Gauge, Clock, AlertTriangle, Square, Radio, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG, SAMPLE_LOCATIONS } from '@/lib/constants';
import type { Emergency } from '@/lib/types';

export function DriverDashboard() {
  const { currentUser, driverActiveEmergency, setDriverActiveEmergency, activeEmergencies, setActiveEmergencies } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [startDialog, setStartDialog] = useState(false);
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const driver = currentUser?.driver;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergencies');
      const data = await res.json();
      const driverEmergencies = data.emergencies.filter(
        (e: Emergency) => e.driverId === driver?.id && e.status === 'ACTIVE'
      );
      setActiveEmergencies(driverEmergencies);
      if (driverEmergencies.length > 0) {
        setDriverActiveEmergency(driverEmergencies[0]);
      }
    } catch {
      console.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [driver?.id, setActiveEmergencies, setDriverActiveEmergency]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (!driverActiveEmergency) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(driverActiveEmergency.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [driverActiveEmergency]);

  const handleStartEmergency = async () => {
    if (!driver?.id) {
      toast.error('Driver profile not found. Please log in again.');
      return;
    }
    if (!destination.trim()) {
      toast.error('Please enter or select a destination');
      return;
    }
    const lat = parseFloat(destLat);
    const lng = parseFloat(destLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please select a destination with valid coordinates');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/emergencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          vehicleType: driver.vehicleType,
          destinationName: destination.trim(),
          destinationLatitude: lat,
          destinationLongitude: lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start emergency');
        return;
      }
      toast.success('🚨 Emergency trip started! Navigate carefully.');
      setDriverActiveEmergency(data.emergency);
      setStartDialog(false);
      setDestination('');
      setDestLat('');
      setDestLng('');
      loadDashboard();
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopEmergency = async () => {
    if (!driverActiveEmergency) return;
    try {
      await fetch('/api/emergencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverActiveEmergency.id, status: 'COMPLETED' }),
      });
      toast.success('Emergency trip completed successfully!');
      setDriverActiveEmergency(null);
      loadDashboard();
    } catch {
      toast.error('Failed to stop emergency');
    }
  };

  const selectSampleDestination = (name: string, lat: number, lng: number) => {
    setDestination(name);
    setDestLat(lat.toString());
    setDestLng(lng.toString());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {VEHICLE_TYPE_CONFIG[driver?.vehicleType || 'AMBULANCE'].emoji} {driver?.vehicleNumber || 'Vehicle'} — {driver?.online ? 'Online' : 'Offline'}
          </p>
        </div>
        {driverActiveEmergency ? (
          <Button variant="destructive" onClick={handleStopEmergency} className="gap-2">
            <Square className="h-4 w-4" /> End Emergency
          </Button>
        ) : (
          <Button onClick={() => setStartDialog(true)} className="gap-2">
            <Play className="h-4 w-4" /> Start Emergency
          </Button>
        )}
      </div>

      {driverActiveEmergency ? (
        <>
          {/* Active Emergency Panel */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full bg-destructive emergency-pulse" />
              <span className="font-semibold text-destructive">Active Emergency</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{VEHICLE_TYPE_CONFIG[driverActiveEmergency.vehicleType].emoji}</span>
              <div>
                <p className="font-medium">Destination: {driverActiveEmergency.destinationName}</p>
                <p className="text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {driverActiveEmergency.destinationLatitude.toFixed(4)}, {driverActiveEmergency.destinationLongitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* Live Data Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Speed</p>
                  <p className="text-xl font-bold">{driverActiveEmergency.speed ? `${driverActiveEmergency.speed}` : '0'} <span className="text-sm font-normal">km/h</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-xl font-bold">{driverActiveEmergency.distanceRemaining?.toFixed(1) || '0'} <span className="text-sm font-normal">km</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="text-xl font-bold">{formatTime(driverActiveEmergency.eta || 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Elapsed</p>
                  <p className="text-xl font-bold">{formatTime(elapsed)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-5xl">🚑</div>
            <div>
              <h3 className="font-semibold text-lg">Ready for Emergency Response</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Press &quot;Start Emergency&quot; to begin a new emergency trip. The system will calculate the optimal route and notify nearby boards and users.
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> GPS Active</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Boards Connected</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Notifications Ready</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Emergency Dialog */}
      <Dialog open={startDialog} onOpenChange={setStartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Start Emergency Trip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destination Name *</Label>
              <Input placeholder="Hospital or location name" value={destination} onChange={(e) => setDestination(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input placeholder="27.7172" value={destLat} onChange={(e) => setDestLat(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input placeholder="85.324" value={destLng} onChange={(e) => setDestLng(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Quick Select</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SAMPLE_LOCATIONS.hospitals.map((loc) => (
                  <Button key={loc.name} variant="outline" size="sm" className="justify-start text-xs h-auto py-2"
                    onClick={() => selectSampleDestination(loc.name, loc.lat, loc.lng)}>
                    🏥 {loc.name.split(' ').slice(0, 2).join(' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Starting an emergency trip will notify all nearby display boards and users. Use this only for genuine emergencies.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialog(false)}>Cancel</Button>
            <Button onClick={handleStartEmergency} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Starting...
                </>
              ) : (
                <><Play className="h-4 w-4 mr-1" /> Start Emergency</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
