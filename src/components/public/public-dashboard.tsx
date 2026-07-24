'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  Radio,
  RefreshCw,
  Crosshair,
  ChevronRight,
  Route,
} from 'lucide-react';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';

// Dynamic import — Leaflet cannot run on the server
const MiniMap = dynamic(() => import('@/components/shared/mini-map'), {
  ssr: false,
  loading: () => <MiniMapSkeleton />,
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

export function PublicDashboard() {
  const { activeEmergencies, setActiveEmergencies, boards, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
      await fetch('/api/gps-simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const emRes = await fetch('/api/emergencies');
      const emData = await emRes.json();
      const active = emData.emergencies.filter(
        (e: Emergency) => e.status === 'ACTIVE'
      );
      setActiveEmergencies(active);
      setLastUpdated(new Date());
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

  // ── Try to get user's geolocation ──
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { /* silently use default */ },
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
        <Skeleton className="h-12 rounded-lg" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page heading ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emergency Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live tracking of nearby emergency vehicles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userLocation && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Crosshair className="h-3 w-3" /> My Location
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Active alerts banner ── */}
      {hasEmergencies && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
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

      {/* ── Tracking error ── */}
      {trackingError && (
        <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 text-center">
          {trackingError}
        </div>
      )}

      {/* ── Emergency Cards with Mini Maps ── */}
      <div className="space-y-4">
        {activeEmergencies.map((emergency) => {
          const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
          return (
            <Card
              key={emergency.id}
              className="emergency-flash overflow-hidden rounded-xl border-destructive/20"
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* ── Left: Info section ── */}
                  <div className="flex-1 p-4 sm:p-5">
                    {/* Vehicle header */}
                    <div className="flex items-center gap-3">
                      <div className="text-3xl shrink-0">{vtConfig.emoji}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base leading-tight">
                          {vtConfig.label} Responding
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          <span className="truncate">{emergency.destinationName}</span>
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
                          📏 {emergency.distanceRemaining.toFixed(1)} km
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    {emergency.distanceRemaining != null && (
                      <div className="mt-3 ml-12">
                        <div className="h-1.5 w-full max-w-[200px] rounded-full bg-muted overflow-hidden">
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

        {!hasEmergencies && (
          <Card className="border-dashed rounded-xl">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto text-green-500 mb-2" />
              <p className="font-medium">All Clear</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[300px] mx-auto">
                No active emergencies in your area. You will be notified when emergency vehicles are nearby.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Board Alerts ── */}
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
    </div>
  );
}
