'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check, AlertTriangle } from 'lucide-react';
import { NOTIFICATION_TYPE_CONFIG } from '@/lib/constants';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function PublicAlerts() {
  const { currentUser, notifications, setNotifications, markNotificationRead, unreadCount } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
        const data = await res.json();
        setNotifications(data.notifications);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [currentUser, setNotifications]);

  const handleMarkRead = async (id: string) => {
    markNotificationRead(id);
    try {
      await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = () => {
    (notifications || []).filter((n) => !n.read).forEach((n) => markNotificationRead(n.id));
    toast.success('All notifications marked as read');
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm text-primary hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {(notifications || []).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground">You&apos;ll receive alerts when emergency vehicles are nearby.</p>
            </CardContent>
          </Card>
        ) : (
          (notifications || []).map((notification) => {
            const typeConfig = notification.type ? NOTIFICATION_TYPE_CONFIG[notification.type] : null;
            return (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${!notification.read ? 'border-primary/20 bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => !notification.read && handleMarkRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {!notification.read ? (
                          <AlertTriangle className="h-4 w-4 text-primary" />
                        ) : typeConfig ? (
                          <Bell className={`h-4 w-4`} style={{ color: typeConfig.color }} />
                        ) : (
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notification.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {typeConfig && (
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
                          {typeConfig.label}
                        </Badge>
                      )}
                      {!notification.read && (
                        <button onClick={(e) => { e.stopPropagation(); handleMarkRead(notification.id); }} className="text-muted-foreground hover:text-primary">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 ml-7">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
