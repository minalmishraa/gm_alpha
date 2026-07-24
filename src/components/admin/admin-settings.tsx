'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Database, Globe, Shield, Clock, Radio, Truck } from 'lucide-react';

export function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure system settings and preferences</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> System Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">GPS Update Interval</Label>
                <p className="text-xs text-muted-foreground">How often vehicle positions are updated</p>
              </div>
              <Badge variant="outline">2 seconds</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Board Check Interval</Label>
                <p className="text-xs text-muted-foreground">How often boards check for emergencies</p>
              </div>
              <Badge variant="outline">5 seconds</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Heartbeat Interval</Label>
                <p className="text-xs text-muted-foreground">Board heartbeat frequency</p>
              </div>
              <Badge variant="outline">30 seconds</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Default Board Radius</Label>
                <p className="text-xs text-muted-foreground">Alert radius for display boards</p>
              </div>
              <Badge variant="outline">500 meters</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">User Notification Radius</Label>
                <p className="text-xs text-muted-foreground">Push notification radius for users</p>
              </div>
              <Badge variant="outline">1000 meters</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Send alerts to nearby users</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Board Alerts</Label>
                <p className="text-xs text-muted-foreground">Notify display boards of emergencies</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email alerts to admins</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Board Offline Alerts</Label>
                <p className="text-xs text-muted-foreground">Alert when board goes offline</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System Name</span>
              <span className="font-medium">SERIRAS v1.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Environment</span>
              <Badge variant="outline">Production</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Database</span>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span>Connected</span></div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Realtime Service</span>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span>Active</span></div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">API Status</span>
              <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /><span>Healthy</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">HTTPS Enforcement</Label>
                <p className="text-xs text-muted-foreground">Force all connections over HTTPS</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Input Sanitization</Label>
                <p className="text-xs text-muted-foreground">Sanitize all user inputs</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Rate Limiting</Label>
                <p className="text-xs text-muted-foreground">Limit API request frequency</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
