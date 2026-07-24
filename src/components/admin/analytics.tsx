'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';

interface WeeklyData { day: string; started: number; completed: number; }
interface VehicleDist { type: string; count: number; }

const COLORS = ['#DC2626', '#F97316', '#3B82F6', '#8B5CF6'];

export function Analytics() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [vehicleDist, setVehicleDist] = useState<VehicleDist[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayEmergencies: 0, activeEmergencies: 0, completedToday: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setWeeklyData(data.weeklyData || []);
        setVehicleDist(data.vehicleDistribution || []);
        setStats({
          todayEmergencies: data.stats?.todayEmergencies || 0,
          activeEmergencies: data.stats?.activeEmergencies || 0,
          completedToday: data.stats?.completedToday || 0,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">System performance and emergency response insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Today&apos;s Total</p>
              <p className="text-xl font-bold">{stats.todayEmergencies}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Activity className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-xl font-bold">{stats.activeEmergencies}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Today</p>
              <p className="text-xl font-bold">{stats.completedToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-xl font-bold">{stats.todayEmergencies > 0 ? Math.round((stats.completedToday / stats.todayEmergencies) * 100) : 0}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Emergency Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="started" name="Started" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vehicle Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {vehicleDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vehicleDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="count" nameKey="type" label={({ type, count }) => `${VEHICLE_TYPE_CONFIG[type as keyof typeof VEHICLE_TYPE_CONFIG]?.emoji || ''} ${count}`}>
                      {vehicleDist.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No vehicle data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
