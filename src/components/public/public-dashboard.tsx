'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  Radio,
  Navigation,
  RefreshCw,
  Crosshair,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';

// Dynamic import — Leaflet cannot run on the server
const EmergencyMap = dynamic(() => import('@/components/shared/emergency-map'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="w-full h-full min-h-[280px] rounded-lg bg-muted/40 animate-pulse flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="text-3xl">🗺️</div>
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}

// ── Format ETA seconds → "X min Ys" ──
function formatETA(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return 'Arrived';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function PublicDashboard() {
  const { activeEmergencies, setActiveEmergencies, boards, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Tell the backend to simulate movement
      await fetch('/api/gps-simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      // Reload updated positions
      const emRes = await fetch('/api/emergencies');
      const emData = await emRes.json();
      const active = emData.emergencies.filter(
        (e: Emergency) => e.status === 'ACTIVE'
      );
      setActiveEmergencies(active);
      setLastUpdated(new Date());
    } catch {
      // Silent — don't spam errors, just try again next tick
    }
  }, [setActiveEmergencies]);

  // ── Initial load + polling loop ──
  useEffect(() => {
    loadData();

    // Poll every 4 seconds for live GPS updates
    intervalRef.current = setInterval(tickGPS, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData, tickGPS]);

  // ── Try to get user's geolocation for the map center ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Geolocation denied — we silently use default center
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const alertBoards = (boards || []).filter((b) => b.displayMessage);
  const hasEmergencies = activeEmergencies.length > 0;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[380px] rounded-lg" />
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page heading ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emergency Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live tracking of nearby emergency vehicles
        </p>
      </div>

      {/* ── Active alerts banner ── */}
      {hasEmergencies && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full bg-destructive emergency-pulse" />
            <span className="font-semibold text-destructive text-sm">
              {activeEmergencies.length} Active Emergency{activeEmergencies.length > 1 ? 'ies' : ''} Nearby
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Please give way to emergency vehicles. Pull over safely and wait until they pass.
          </p>
        </div>
      )}

      {/* ── MAIN CONTENT: Map + Sidebar cards ── */}
      <div className={`grid gap-4 ${mapExpanded ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
        {/* ── Map (takes 2/3 on desktop, full on expanded) ── */}
        <Card className={`overflow-hidden ${mapExpanded ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                📍 Live Vehicle Tracking
              </CardTitle>
              {lastUpdated && (
                <span className="text-[10px] text-muted-foreground">
                  Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {userLocation && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Crosshair className="h-3 w-3" /> My Location
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMapExpanded(!mapExpanded)}
                title={mapExpanded ? 'Collapse map' : 'Expand map'}
              >
                {mapExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadData} title="Refresh data">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hasEmergencies ? (
              <div className={mapExpanded ? 'h-[500px]' : 'h-[380px]'}>
                <EmergencyMap
                  emergencies={activeEmergencies}
                  userLat={userLocation?.lat}
                  userLng={userLocation?.lng}
                />
              </div>
            ) : (
              <div className="h-[380px] flex items-center justify-center bg-muted/20 rounded-b-lg">
                <div className="text-center space-y-2">
                  <ShieldCheck className="h-10 w-10 mx-auto text-green-500" />
                  <p className="font-medium text-sm">All Clear</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    No active emergencies in your area. You will be notified when emergency vehicles are nearby.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right sidebar: Vehicle cards + ETA ── */}
        <div className="lg:col-span-1 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
          {trackingError && (
            <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 text-center">
              {trackingError}
            </div>
          )}

          {activeEmergencies.map((emergency) => {
            const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
            return (
              <Card
                key={emergency.id}
                className={`overflow-hidden ${!mapExpanded ? 'emergency-flash' : ''}`}
              >
                <CardContent className="p-3">
                  {/* Vehicle header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{vtConfig.emoji}</span>
                      <div>
                        <p className="font-semibold text-sm leading-tight">
                          {vtConfig.label} Responding
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{emergency.destinationName}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Driver info */}
                  {emergency.driver?.user?.name && (
                    <p className="text-[11px] text-muted-foreground mt-2 ml-9">
                      🧑 {emergency.driver.user.name}
                    </p>
                  )}

                  {/* Metrics row */}
                  <div className="flex items-center gap-2 mt-2 ml-9 flex-wrap">
                    <Badge
                      variant="destructive"
                      className="text-[11px] px-2 py-0.5 font-bold"
                    >
                      ⏱ ETA {formatETA(emergency.eta)}
                    </Badge>
                    {emergency.speed != null && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                        🚀 {emergency.speed} km/h
                      </Badge>
                    )}
                    {emergency.distanceRemaining != null && (
                      <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                        📏 {emergency.distanceRemaining.toFixed(1)} km
                      </Badge>
                    )}
                  </div>

                  {/* Mini progress bar (distance remaining) */}
                  {emergency.distanceRemaining != null && (
                    <div className="mt-2 ml-9">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive transition-all duration-1000 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(5, 100 - (emergency.distanceRemaining / 5) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                        {emergency.distanceRemaining.toFixed(1)} km remaining
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!hasEmergencies && (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <ShieldCheck className="h-6 w-6 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">
                  No active emergencies right now
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Board Alerts ── */}
      {alertBoards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-orange-500" /> Roadside Board Alerts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {alertBoards.map((board) => (
              <Card key={board.id} className="border-orange-500/20 bg-orange-500/5">
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
    </div>
  );
}
