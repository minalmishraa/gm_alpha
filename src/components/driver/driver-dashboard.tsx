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
import { Navigation, MapPin, Gauge, Clock, AlertTriangle, Square, Radio, Play, CheckCircle2, Loader2, Wifi } from 'lucide-react';
import dynamic from 'next/dynamic';
import { VEHICLE_TYPE_CONFIG, SAMPLE_LOCATIONS } from '@/lib/constants';
import type { Emergency } from '@/lib/types';
import { LiveGpsTracker } from '@/components/shared/live-gps-tracker';
import { broadcastLiveSync } from '@/lib/sync-broadcast';

const LocationPickerMap = dynamic(() => import('@/components/shared/location-picker-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});

export function DriverDashboard() {
  const { currentUser, driverActiveEmergency, setDriverActiveEmergency, activeEmergencies, setActiveEmergencies } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [startDialog, setStartDialog] = useState(false);
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const driver = currentUser?.driver;

  const loadDashboard = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/emergencies');
      if (!res.ok) return;
      const data = await res.json();
      const emergenciesList = Array.isArray(data?.emergencies) ? data.emergencies : [];
      const driverEmergencies = emergenciesList.filter(
        (e: Emergency) => e.driverId === driver?.id && e.status === 'ACTIVE'
      );
      setActiveEmergencies(driverEmergencies);
      if (driverEmergencies.length > 0) {
        setDriverActiveEmergency(driverEmergencies[0]);
      } else {
        setDriverActiveEmergency(null);
      }
    } catch {
      // Silent error handler
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [driver?.id, setActiveEmergencies, setDriverActiveEmergency]);

  useEffect(() => { loadDashboard(true); }, [loadDashboard]);

  useEffect(() => {
    if (!driverActiveEmergency) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(driverActiveEmergency.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [driverActiveEmergency]);

  const handleStartEmergency = async () => {
    let activeDriverId = driver?.id;
    let activeVehicleType = driver?.vehicleType || 'AMBULANCE';

    if (!activeDriverId && currentUser?.id) {
      try {
        const res = await fetch('/api/drivers');
        const data = await res.json();
        const found = data.drivers?.find((d: { userId: string }) => d.userId === currentUser.id);
        if (found) {
          activeDriverId = found.id;
          activeVehicleType = found.vehicleType;
        }
      } catch { /* ignore */ }
    }

    if (!activeDriverId) {
      toast.error('Driver profile not found. Please re-login as a driver.');
      return;
    }

    const lat = parseFloat(destLat);
    const lng = parseFloat(destLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please click on the map or select a hospital to set destination coordinates');
      return;
    }

    let finalDestination = destination.trim();
    if (!finalDestination) {
      finalDestination = `Emergency Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setDestination(finalDestination);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/emergencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: activeDriverId,
          vehicleType: activeVehicleType,
          destinationName: finalDestination,
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
      broadcastLiveSync('EMERGENCY_STARTED', data.emergency);
      setStartDialog(false);
      setDestination('');
      setDestLat('');
      setDestLng('');
      await loadDashboard(false);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopEmergency = async () => {
    if (!driverActiveEmergency || stopping) return;
    const targetId = driverActiveEmergency.id;
    setStopping(true);
    setDriverActiveEmergency(null); // Immediately clear local active emergency to halt GPS watch
    try {
      const res = await fetch('/api/emergencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, status: 'COMPLETED' }),
      });
      if (res.ok) {
        toast.success('Emergency trip completed successfully!');
        broadcastLiveSync('EMERGENCY_ENDED', { id: targetId });
      } else {
        toast.error('Failed to stop emergency trip');
      }
      await loadDashboard(false);
    } catch {
      toast.error('Failed to stop emergency');
    } finally {
      setStopping(false);
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
      <LiveGpsTracker onSyncRefresh={() => loadDashboard(false)} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {VEHICLE_TYPE_CONFIG[driver?.vehicleType || 'AMBULANCE'].emoji} {driver?.vehicleNumber || 'Vehicle'} — {driver?.online ? 'Online' : 'Offline'}
          </p>
        </div>
        {driverActiveEmergency ? (
          <Button variant="destructive" onClick={handleStopEmergency} disabled={stopping} className="gap-2">
            {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            {stopping ? 'Ending Emergency...' : 'End Emergency'}
          </Button>
        ) : (
          <Button type="button" onClick={() => {
            if (!destLat || !destLng) {
              const defaultLoc = SAMPLE_LOCATIONS.hospitals[0];
              setDestination(defaultLoc.name);
              setDestLat(defaultLoc.lat.toString());
              setDestLng(defaultLoc.lng.toString());
            }
            setStartDialog(true);
          }} className="gap-2">
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Start Emergency Trip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Interactive Location Picker Map */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>Select Destination on Map</span>
                <span className="text-xs font-normal text-muted-foreground">Click map, drag pin, or search</span>
              </Label>
              <LocationPickerMap
                initialLat={destLat ? parseFloat(destLat) : (driver?.currentLatitude ?? undefined)}
                initialLng={destLng ? parseFloat(destLng) : (driver?.currentLongitude ?? undefined)}
                autoDetectGPSOnMount={true}
                onSelectLocation={(lat, lng, addressName) => {
                  setDestLat(lat.toString());
                  setDestLng(lng.toString());
                  if (addressName) {
                    setDestination(addressName);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1.5">
                <Label>Destination Name *</Label>
                <Input placeholder="Hospital or location name" value={destination} onChange={(e) => setDestination(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Latitude</Label>
                <Input placeholder="27.7172" value={destLat} onChange={(e) => setDestLat(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude</Label>
                <Input placeholder="85.324" value={destLng} onChange={(e) => setDestLng(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground font-semibold">Quick Hospital Shortcuts</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {SAMPLE_LOCATIONS.hospitals.map((loc) => (
                  <Button key={loc.name} variant="outline" size="sm" className="justify-start text-xs h-auto py-2"
                    onClick={() => selectSampleDestination(loc.name, loc.lat, loc.lng)}>
                    🏥 {loc.name.split(' ').slice(0, 2).join(' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              Starting an emergency trip will notify all nearby display boards and users. Use this only for genuine emergencies.
            </div>
          </div>
          <DialogFooter className="mt-2">
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
