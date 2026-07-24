'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Truck, Monitor, ShieldCheck, Radio, RefreshCw, Activity } from 'lucide-react';
import type { DashboardStats } from '@/lib/types';
import { motion } from 'framer-motion';

function StatCard({ label, value, icon, color, pulse }: {
  label: string; value: number; icon: React.ReactNode; color: string; pulse?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-l-4" style={{ borderLeftColor: color }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${pulse ? 'emergency-pulse' : ''}`}
              style={{ backgroundColor: `${color}15`, color }}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdminDashboard() {
  const { dashboardStats, setDashboardStats, setActiveEmergencies, setDrivers, setBoards } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, emergenciesRes, driversRes, boardsRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/emergencies'), fetch('/api/drivers'), fetch('/api/boards'),
      ]);
      const statsData = await statsRes.json();
      const emergenciesData = await emergenciesRes.json();
      const driversData = await driversRes.json();
      const boardsData = await boardsRes.json();

      setDashboardStats(statsData.stats);
      setActiveEmergencies(emergenciesData.emergencies.filter((e: { status: string }) => e.status === 'ACTIVE'));
      setDrivers(driversData.drivers);
      setBoards(boardsData.boards);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading && !dashboardStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time emergency response monitoring</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Emergencies" value={stats?.todayEmergencies ?? 0} icon={<AlertTriangle className="h-5 w-5" />} color="#DC2626" />
        <StatCard label="Active Emergencies" value={stats?.activeEmergencies ?? 0} icon={<Radio className="h-5 w-5" />} color="#F97316" pulse={!!stats?.activeEmergencies} />
        <StatCard label="Online Vehicles" value={stats?.onlineVehicles ?? 0} icon={<Truck className="h-5 w-5" />} color="#16A34A" />
        <StatCard label="Offline Vehicles" value={stats?.offlineBoards ?? 0} icon={<Truck className="h-5 w-5" />} color="#6B7280" />
        <StatCard label="Connected Boards" value={stats?.connectedBoards ?? 0} icon={<Monitor className="h-5 w-5" />} color="#3B82F6" />
        <StatCard label="Offline Boards" value={stats?.offlineBoards ?? 0} icon={<Monitor className="h-5 w-5" />} color="#EF4444" />
        <StatCard label="Pending Verifications" value={stats?.pendingVerifications ?? 0} icon={<ShieldCheck className="h-5 w-5" />} color="#F59E0B" />
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={<Activity className="h-5 w-5" />} color="#8B5CF6" />
      </div>

      {/* System Status Banner */}
      {stats && stats.activeEmergencies > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3"
        >
          <div className="h-3 w-3 rounded-full bg-destructive emergency-pulse" />
          <p className="text-sm font-medium text-destructive">
            {stats.activeEmergencies} active emergency{stats.activeEmergencies > 1 ? 'ies' : 'y'} in progress. Monitoring live.
          </p>
        </motion.div>
      )}
    </div>
  );
}
