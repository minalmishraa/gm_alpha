'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { broadcastLiveSync, subscribeLiveSync } from '@/lib/sync-broadcast';

interface LiveGpsTrackerProps {
  onSyncRefresh?: () => void;
}

export function LiveGpsTracker({ onSyncRefresh }: LiveGpsTrackerProps) {
  const { currentUser, driverActiveEmergency, setActiveEmergencies, setDriverActiveEmergency } = useAppStore();
  const watchIdRef = useRef<number | null>(null);

  // 1. Subscribe to BroadcastChannel sync from other tabs
  useEffect(() => {
    const unsubscribe = subscribeLiveSync((event) => {
      if (
        event.type === 'EMERGENCY_UPDATED' ||
        event.type === 'EMERGENCY_STARTED' ||
        event.type === 'EMERGENCY_ENDED' ||
        event.type === 'GPS_TICK'
      ) {
        if (onSyncRefresh) {
          onSyncRefresh();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onSyncRefresh]);

  // 2. Active Driver GPS Auto-Tracking (watchPosition)
  useEffect(() => {
    if (!currentUser?.driver || !driverActiveEmergency || driverActiveEmergency.status !== 'ACTIVE') {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    // Continuous high-accuracy GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const currentSpeedKmH = speed ? Math.round(speed * 3.6) : 40;

        try {
          const res = await fetch('/api/emergencies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: driverActiveEmergency.id,
              currentLatitude: latitude,
              currentLongitude: longitude,
              speed: currentSpeedKmH,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.emergency) {
              setDriverActiveEmergency(data.emergency);
              // Broadcast location change to all open tabs synchronously
              broadcastLiveSync('EMERGENCY_UPDATED', { id: data.emergency.id, lat: latitude, lng: longitude });
            }
          }
        } catch {
          // Ignore network glitch on watchPosition
        }
      },
      (err) => {
        console.warn('GPS watchPosition error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentUser?.driver, driverActiveEmergency, setDriverActiveEmergency]);

  return null;
}
