'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG, EMERGENCY_STATUS_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';
import { format } from 'date-fns';

export function DriverHistory() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/emergencies');
        const data = await res.json();
        setEmergencies(data.emergencies.filter((e: Emergency) => e.status !== 'ACTIVE'));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emergency History</h1>
        <p className="text-sm text-muted-foreground">Your past emergency responses</p>
      </div>

      {emergencies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold">No History Yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Your completed emergency trips will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emergencies.map((emergency) => {
            const vtConfig = VEHICLE_TYPE_CONFIG[emergency.vehicleType];
            const stConfig = EMERGENCY_STATUS_CONFIG[emergency.status];
            const duration = emergency.endedAt
              ? Math.floor((new Date(emergency.endedAt).getTime() - new Date(emergency.startedAt).getTime()) / 60000)
              : null;

            return (
              <Card key={emergency.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{vtConfig.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{emergency.destinationName}</h3>
                          <Badge variant="outline" className={stConfig.color}>{stConfig.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(emergency.startedAt), 'MMM d, yyyy HH:mm')}</span>
                          {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration} min</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {emergency.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {emergency.status === 'CANCELLED' && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
