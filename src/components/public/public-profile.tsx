'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_CONFIG } from '@/lib/constants';

export function PublicProfile() {
  const { currentUser } = useAppStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {currentUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-lg">{currentUser?.name}</p>
              <Badge variant="outline" className={ROLE_CONFIG[currentUser?.role || 'PUBLIC'].color}>{ROLE_CONFIG[currentUser?.role || 'PUBLIC'].label}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium mt-0.5">{currentUser?.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium mt-0.5">{currentUser?.phone || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="mt-0.5"><Badge variant="outline">{currentUser?.status}</Badge></p>
            </div>
            <div>
              <span className="text-muted-foreground">Member Since</span>
              <p className="font-medium mt-0.5">{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
