'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VEHICLE_TYPE_CONFIG, ROLE_CONFIG } from '@/lib/constants';

export function DriverProfile() {
  const { currentUser } = useAppStore();
  const driver = currentUser?.driver;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your driver profile information</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-lg">{currentUser?.name}</p>
                <Badge variant="outline" className={ROLE_CONFIG[currentUser?.role || 'DRIVER'].color}>{ROLE_CONFIG[currentUser?.role || 'DRIVER'].label}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Email</span><p className="font-medium">{currentUser?.email}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{currentUser?.phone || 'N/A'}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b">
              <span className="text-3xl">{VEHICLE_TYPE_CONFIG[driver?.vehicleType || 'AMBULANCE'].emoji}</span>
              <div>
                <p className="font-semibold">{VEHICLE_TYPE_CONFIG[driver?.vehicleType || 'AMBULANCE'].label}</p>
                <p className="text-sm text-muted-foreground">{driver?.vehicleNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">License</span><p className="font-medium">{driver?.licenseNumber || 'N/A'}</p></div>
              <div><span className="text-muted-foreground">Verified</span><p><Badge variant={driver?.verified ? 'outline' : 'destructive'}>{driver?.verified ? 'Yes' : 'Pending'}</Badge></p></div>
              <div><span className="text-muted-foreground">Status</span><p><Badge variant={driver?.online ? 'outline' : 'secondary'}>{driver?.online ? 'Online' : 'Offline'}</Badge></p></div>
              <div><span className="text-muted-foreground">Active Emergency</span><p><Badge variant={driver?.activeEmergency ? 'destructive' : 'secondary'}>{driver?.activeEmergency ? 'Yes' : 'No'}</Badge></p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
