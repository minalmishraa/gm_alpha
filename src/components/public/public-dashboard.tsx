'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Truck, MapPin, Clock, ShieldCheck, Radio, Navigation } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

export function PublicDashboard() {
  const { activeEmergencies, setActiveEmergencies, boards, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [emRes, boardRes] = await Promise.all([fetch('/api/emergencies'), fetch('/api/boards')]);
        const emData = await emRes.json();
        const boardData = await boardRes.json();
        setActiveEmergencies(emData.emergencies.filter((e: Emergency) => e.status === 'ACTIVE'));
        setBoards(boardData.boards);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [setActiveEmergencies, setBoards]);

  const alertBoards = (boards || []).filter((b) => b.displayMessage);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emergency Dashboard</h1>
        <p className="text-sm text-muted-foreground">Stay informed about nearby emergency vehicles</p>
      </div>

      {/* Active Alerts Banner */}
      {activeEmergencies.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full bg-destructive emergency-pulse" />
            <span className="font-semibold text-destructive text-sm">
              {activeEmergencies.length} Active Emergency{activeEmergencies.length > 1 ? 'ies' : ''} Nearby
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Please give way to emergency vehicles. Pull over safely and wait until they pass.</p>
        </div>
      )}

      {/* Active Emergencies */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Active Emergencies
        </h2>
        <div className="grid gap-3">
          {activeEmergencies.map((emergency) => {
            const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
            return (
              <Card key={emergency.id} className="emergency-flash border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{vtConfig.emoji}</span>
                      <div>
                        <p className="font-semibold">{vtConfig.label} Responding</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" /> Heading to {emergency.destinationName}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {emergency.speed && (
                            <Badge variant="outline" className="text-xs"><Truck className="h-3 w-3 mr-1" />{emergency.speed} km/h</Badge>
                          )}
                          {emergency.distanceRemaining && (
                            <Badge variant="outline" className="text-xs"><Navigation className="h-3 w-3 mr-1" />{emergency.distanceRemaining.toFixed(1)} km away</Badge>
                          )}
                          {emergency.eta && (
                            <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />ETA {Math.floor(emergency.eta / 60)} min</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {activeEmergencies.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-medium text-sm">All Clear — No Active Emergencies</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">You will be notified when emergency vehicles are nearby.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Board Alerts */}
      {alertBoards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-orange-500" /> Roadside Board Alerts
          </h2>
          <div className="grid gap-3">
            {alertBoards.map((board) => (
              <Card key={board.id} className="border-orange-500/20 bg-orange-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{board.boardName}</p>
                      <p className="text-sm mt-1 font-medium text-orange-600 dark:text-orange-400">{board.displayMessage}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {board.eta && <span>ETA: {Math.floor(board.eta / 60)}:{(board.eta % 60).toString().padStart(2, '0')}</span>}
                        {board.direction && <span>From: {board.direction}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-orange-500 text-orange-600">Displaying</Badge>
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
