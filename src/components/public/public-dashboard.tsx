'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  Radio,
  RefreshCw,
  Crosshair,
  Compass,
  Filter,
  Navigation,
  Check,
  Loader2,
} from 'lucide-react';
import { VEHICLE_TYPE_CONFIG, SAMPLE_LOCATIONS } from '@/lib/constants';
import type { Emergency } from '@/lib/types';
import { LiveGpsTracker } from '@/components/shared/live-gps-tracker';
import { broadcastLiveSync } from '@/lib/sync-broadcast';

// Dynamic imports — Leaflet cannot run on server
const MiniMap = dynamic(() => import('@/components/shared/mini-map'), {
  ssr: false,
  loading: () => <MiniMapSkeleton />,
});

const LocationPickerMap = dynamic(() => import('@/components/shared/location-picker-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});

function MiniMapSkeleton() {
  return (
    <div className="w-full h-full min-h-[120px] rounded-lg bg-muted/40 animate-pulse flex items-center justify-center">
      <div className="text-center space-y-1">
        <div className="text-xl">🗺️</div>
        <p className="text-[9px] text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ── Format ETA seconds → "Xm Ys" ──
function formatETA(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Arrived';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ── Distance calculation (Haversine formula in km) ──
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Check proximity and trajectory to user location ──
function checkEmergencyProximity(
  emergency: Emergency,
  userLat: number,
  userLng: number,
  maxRadiusKm = 5.0
) {
  const vLat = emergency.currentLatitude ?? 27.7172;
  const vLng = emergency.currentLongitude ?? 85.324;
  const dLat = emergency.destinationLatitude;
  const dLng = emergency.destinationLongitude;

  const distToVehicle = calculateDistanceKm(userLat, userLng, vLat, vLng);
  const distToDest = calculateDistanceKm(userLat, userLng, dLat, dLng);
  const totalTripDist = calculateDistanceKm(vLat, vLng, dLat, dLng);

  // User is along route if sum of distances is close to total trip distance
  const isAlongRoute =
    totalTripDist > 0.1 && distToVehicle + distToDest <= totalTripDist + 1.2;

  const isComingWay = distToVehicle <= maxRadiusKm || distToDest <= maxRadiusKm || isAlongRoute;

  let label = '';
  let badgeColor = 'bg-orange-500/10 text-orange-600 border-orange-500/20';

  if (distToVehicle < 0.8) {
    label = `🚨 Passing right by you (${(distToVehicle * 1000).toFixed(0)}m away)`;
    badgeColor = 'bg-red-500/15 text-red-600 border-red-500/30 animate-pulse font-bold';
  } else if (isAlongRoute) {
    label = `⚠️ Heading towards your location (${distToVehicle.toFixed(1)} km away)`;
    badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold';
  } else if (distToVehicle <= maxRadiusKm) {
    label = `📍 In your area (${distToVehicle.toFixed(1)} km away)`;
    badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  } else {
    label = `📍 ${distToVehicle.toFixed(1)} km from your location`;
    badgeColor = 'bg-muted text-muted-foreground';
  }

  return { isComingWay, distToVehicle, label, badgeColor };
}

// Preset popular locations for quick selection
const PRESET_USER_LOCATIONS = [
  { name: 'Kathmandu Durbar Square', lat: 27.7042, lng: 85.3066 },
  { name: 'Thamel Main Street', lat: 27.7154, lng: 85.3123 },
  { name: 'Patan Durbar Square', lat: 27.6744, lng: 85.325 },
  { name: 'New Baneshwor', lat: 27.6915, lng: 85.342 },
  { name: 'Pulchowk Chowk', lat: 27.6782, lng: 85.3168 },
];

export function PublicDashboard() {
  const { activeEmergencies, setActiveEmergencies, boards, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // User Location State (Default: Kathmandu center)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [filterComingWayOnly, setFilterComingWayOnly] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Temporary state for location picker dialog
  const [tempLat, setTempLat] = useState(27.7172);
  const [tempLng, setTempLng] = useState(85.324);
  const [tempName, setTempName] = useState('Kathmandu Center');

  // ── Load initial data ──
  const loadData = useCallback(async () => {
    try {
      const [emRes, boardRes] = await Promise.all([
        fetch('/api/emergencies'),
        fetch('/api/boards'),
      ]);
      const emData = await emRes.json();
      const boardData = await boardRes.json();
      const active = emData.emergencies.filter(
        (e: Emergency) => e.status === 'ACTIVE'
      );
      setActiveEmergencies(active);
      setBoards(boardData.boards);
      setLastUpdated(new Date());
      setTrackingError(null);
    } catch {
      setTrackingError('Failed to fetch live data. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [setActiveEmergencies, setBoards]);

  // ── GPS simulation tick: move vehicles + reload ──
  const tickGPS = useCallback(async () => {
    try {
      await fetch('/api/gps-simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const emRes = await fetch('/api/emergencies');
      const emData = await emRes.json();
      const active = emData.emergencies.filter(
        (e: Emergency) => e.status === 'ACTIVE'
      );
      setActiveEmergencies(active);
      setLastUpdated(new Date());
      broadcastLiveSync('GPS_TICK', active);
    } catch {
      // Silent — don't spam errors
    }
  }, [setActiveEmergencies]);

  // ── Initial load + polling loop ──
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(tickGPS, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData, tickGPS]);

  // ── Auto detect GPS location on mount ──
  const detectGPSLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          name: 'My GPS Position',
        });
        setTempLat(latitude);
        setTempLng(longitude);
        setTempName('My GPS Position');
        setLocating(false);
      },
      () => {
        // Default to Kathmandu center if permission denied
        if (!userLocation) {
          setUserLocation({ lat: 27.7172, lng: 85.324, name: 'Kathmandu Central' });
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [userLocation]);

  useEffect(() => {
    detectGPSLocation();
  }, []);

  const alertBoards = (boards || []).filter((b) => b.displayMessage);

  // ── Filter Emergencies: "Coming My Way" vs "All" ──
  const processedEmergencies = activeEmergencies.map((emergency) => {
    const proximity = userLocation
      ? checkEmergencyProximity(emergency, userLocation.lat, userLocation.lng)
      : { isComingWay: true, distToVehicle: 0, label: '', badgeColor: '' };
    return { emergency, proximity };
  });

  const filteredEmergencies = filterComingWayOnly && userLocation
    ? processedEmergencies.filter((item) => item.proximity.isComingWay)
    : processedEmergencies;

  const hasFilteredEmergencies = filteredEmergencies.length > 0;

  // ── Apply selected location from dialog ──
  const handleConfirmLocation = () => {
    setUserLocation({
      lat: tempLat,
      lng: tempLng,
      name: tempName || `${tempLat.toFixed(4)}, ${tempLng.toFixed(4)}`,
    });
    setLocationPickerOpen(false);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-16 rounded-xl" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LiveGpsTracker onSyncRefresh={loadData} />
      {/* ── Page heading ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Public Emergency Alert Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live emergency vehicle tracking customized for your location
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData} title="Refresh Live Data">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── User Location Control Banner ── */}
      <Card className="border-primary/20 bg-primary/5 rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your Active Location
                  </span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-background gap-1">
                    <Crosshair className="h-3 w-3" />
                    {userLocation?.name || 'Kathmandu Central'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {userLocation
                    ? `Coordinates: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)} — Showing emergencies nearby`
                    : 'Set your location to see emergencies heading your way.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={detectGPSLocation}
                disabled={locating}
                className="h-8 text-xs gap-1.5 bg-background"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 text-blue-600" />}
                {locating ? 'Detecting...' : 'Detect GPS'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setLocationPickerOpen(true)}
                className="h-8 text-xs gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                Select on Map
              </Button>
            </div>
          </div>

          {/* Quick Location Shortcuts */}
          <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground text-[11px] font-medium mr-1">Quick Places:</span>
            {PRESET_USER_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                onClick={() => setUserLocation({ lat: loc.lat, lng: loc.lng, name: loc.name })}
                className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                  userLocation?.name === loc.name
                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border'
                }`}
              >
                {loc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Filter Bar: "Coming My Way" vs "All Emergencies" ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-muted/30 p-2.5 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground ml-1" />
          <span className="text-xs font-semibold text-foreground">Filter Mode:</span>
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
            <button
              onClick={() => setFilterComingWayOnly(true)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterComingWayOnly
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Navigation className="h-3 w-3" />
              Heading My Way ({processedEmergencies.filter((e) => e.proximity.isComingWay).length})
            </button>
            <button
              onClick={() => setFilterComingWayOnly(false)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                !filterComingWayOnly
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Emergencies ({activeEmergencies.length})
            </button>
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredEmergencies.length} of {activeEmergencies.length} active emergency alerts
        </span>
      </div>

      {/* ── Active alerts banner ── */}
      {hasFilteredEmergencies && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-destructive emergency-pulse" />
            <span className="font-semibold text-destructive text-sm">
              {filteredEmergencies.length} Emergency Vehicle{filteredEmergencies.length > 1 ? 's' : ''}{' '}
              {filterComingWayOnly ? 'Heading Near Your Location' : 'Active'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Please prepare to clear the road or pull over safely if an emergency vehicle approaches.
          </p>
        </div>
      )}

      {/* ── Tracking error ── */}
      {trackingError && (
        <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 text-center">
          {trackingError}
        </div>
      )}

      {/* ── Emergency Cards with Mini Maps ── */}
      <div className="space-y-4">
        {filteredEmergencies.map(({ emergency, proximity }) => {
          const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
          return (
            <Card
              key={emergency.id}
              className="emergency-flash overflow-hidden rounded-xl border-destructive/20 relative"
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* ── Left: Info section ── */}
                  <div className="flex-1 p-4 sm:p-5">
                    {/* Trajectory & Proximity Banner */}
                    {proximity.label && (
                      <div className="mb-3">
                        <Badge variant="outline" className={`text-xs px-2.5 py-1 ${proximity.badgeColor}`}>
                          {proximity.label}
                        </Badge>
                      </div>
                    )}

                    {/* Vehicle header */}
                    <div className="flex items-center gap-3">
                      <div className="text-3xl shrink-0">{vtConfig.emoji}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base leading-tight">
                          {vtConfig.label} Responding
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          <span className="truncate">Destination: {emergency.destinationName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Driver info */}
                    {emergency.driver?.user?.name && (
                      <p className="text-xs text-muted-foreground mt-2.5 ml-12">
                        🧑 Driver: {emergency.driver.user.name}
                        {emergency.driver.vehicleNumber && (
                          <span className="ml-2">· {emergency.driver.vehicleNumber}</span>
                        )}
                      </p>
                    )}

                    {/* Metrics row */}
                    <div className="flex items-center gap-2 mt-3 ml-12 flex-wrap">
                      <Badge
                        variant="destructive"
                        className="text-xs px-2.5 py-1 font-bold gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        ETA {formatETA(emergency.eta)}
                      </Badge>
                      {emergency.speed != null && (
                        <Badge variant="secondary" className="text-xs px-2.5 py-1">
                          🚀 {emergency.speed} km/h
                        </Badge>
                      )}
                      {emergency.distanceRemaining != null && (
                        <Badge variant="secondary" className="text-xs px-2.5 py-1">
                          📏 {emergency.distanceRemaining.toFixed(1)} km remaining
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    {emergency.distanceRemaining != null && (
                      <div className="mt-3 ml-12">
                        <div className="h-1.5 w-full max-w-[220px] rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-destructive transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.min(100, Math.max(5, 100 - (emergency.distanceRemaining / 5) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Right: Mini Map (game-style) ── */}
                  <div className="sm:w-56 lg:w-64 shrink-0">
                    <MiniMap
                      emergency={emergency}
                      className="sm:rounded-l-none sm:rounded-r-xl h-36 sm:h-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!hasFilteredEmergencies && (
          <Card className="border-dashed rounded-xl">
            <CardContent className="p-8 text-center space-y-3">
              <ShieldCheck className="h-10 w-10 mx-auto text-green-500" />
              <div>
                <p className="font-semibold text-base">No Emergencies Heading Your Way</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {filterComingWayOnly
                    ? `No active emergency vehicles are currently approaching within 5 km of ${userLocation?.name || 'your location'}.`
                    : 'There are no active emergency alerts across the city right now.'}
                </p>
              </div>

              {filterComingWayOnly && activeEmergencies.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterComingWayOnly(false)}
                  className="text-xs mt-2"
                >
                  View All {activeEmergencies.length} City Emergencies
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Roadside Board Alerts ── */}
      {alertBoards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-orange-500" /> Roadside Board Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {alertBoards.map((board) => (
              <Card key={board.id} className="border-orange-500/20 bg-orange-500/5 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{board.boardName}</p>
                      <p className="text-sm mt-1 font-medium text-orange-600 dark:text-orange-400">
                        {board.displayMessage}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {board.eta && (
                          <span>ETA: {Math.floor(board.eta / 60)}:{(board.eta % 60).toString().padStart(2, '0')}</span>
                        )}
                        {board.direction && <span>From: {board.direction}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-orange-500 text-orange-600 shrink-0">
                      Displaying
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── User Location Selector Dialog ── */}
      <Dialog open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Set Your Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Select or search for your location on the map below. The dashboard will show emergency vehicles heading towards or passing near your location.
            </p>

            <LocationPickerMap
              initialLat={userLocation?.lat || 27.7172}
              initialLng={userLocation?.lng || 85.324}
              onSelectLocation={(lat, lng, addressName) => {
                setTempLat(lat);
                setTempLng(lng);
                if (addressName) {
                  setTempName(addressName);
                }
              }}
              height="280px"
            />

            <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold block">Selected Location:</span>
                <span className="text-muted-foreground truncate">{tempName}</span>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {tempLat.toFixed(4)}, {tempLng.toFixed(4)}
              </Badge>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLocationPickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLocation} className="gap-1">
              <Check className="h-4 w-4" /> Apply Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
