'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { AppShell } from '@/components/layout/app-shell';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { DriverManagement } from '@/components/admin/driver-management';
import { BoardManagement } from '@/components/admin/board-management';
import { EmergencyHistory } from '@/components/admin/emergency-history';
import { HospitalManagement } from '@/components/admin/hospital-management';
import { UserManagement } from '@/components/admin/user-management';
import { Analytics } from '@/components/admin/analytics';
import { AdminSettings } from '@/components/admin/admin-settings';
import { DriverDashboard } from '@/components/driver/driver-dashboard';
import { DriverHistory } from '@/components/driver/driver-history';
import { DriverProfile } from '@/components/driver/driver-profile';
import { PublicDashboard } from '@/components/public/public-dashboard';
import { PublicAlerts } from '@/components/public/public-alerts';
import { EmergencyTips } from '@/components/public/emergency-tips';
import { PublicProfile } from '@/components/public/public-profile';
import { BoardDisplay } from '@/components/board/board-display';

export default function HomePage() {
  const {
    currentView,
    isAuthenticated,
    setCurrentView,
    setAuthenticated,
    setCurrentUser,
    isLoading,
    setLoading,
  } = useAppStore();

  // On mount, check if there's a saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('seriras_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setAuthenticated(true);
        if (user.role === 'ADMIN') setCurrentView('admin-dashboard');
        else if (user.role === 'DRIVER') setCurrentView('driver-dashboard');
        else setCurrentView('public-dashboard');
      } catch {
        localStorage.removeItem('seriras_user');
      }
    }
    setLoading(false);
  }, [setCurrentUser, setAuthenticated, setCurrentView, setLoading]);

  // Save session on auth changes
  useEffect(() => {
    const { currentUser } = useAppStore.getState();
    if (currentUser) {
      localStorage.setItem('seriras_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('seriras_user');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🚑</div>
          <p className="text-sm text-muted-foreground">Loading SERIRAS...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login or register
  if (!isAuthenticated) {
    if (currentView === 'register') {
      return <RegisterForm />;
    }
    return <LoginForm />;
  }

  // Authenticated - render shell with appropriate content
  return (
    <AppShell />
  );
}

// Content router component (used inside AppShell)
export function ContentRouter() {
  const { currentView } = useAppStore();

  switch (currentView) {
    // Admin views
    case 'admin-dashboard':
      return <AdminDashboard />;
    case 'admin-drivers':
      return <DriverManagement />;
    case 'admin-boards':
      return <BoardManagement />;
    case 'admin-emergencies':
      return <EmergencyHistory />;
    case 'admin-hospitals':
      return <HospitalManagement />;
    case 'admin-users':
      return <UserManagement />;
    case 'admin-analytics':
      return <Analytics />;
    case 'admin-settings':
      return <AdminSettings />;

    // Driver views
    case 'driver-dashboard':
      return <DriverDashboard />;
    case 'driver-history':
      return <DriverHistory />;
    case 'driver-profile':
      return <DriverProfile />;

    // Public views
    case 'public-dashboard':
      return <PublicDashboard />;
    case 'public-alerts':
      return <PublicAlerts />;
    case 'public-tips':
      return <EmergencyTips />;
    case 'public-profile':
      return <PublicProfile />;

    // Board view
    case 'board-display':
      return <BoardDisplay />;

    default:
      return <AdminDashboard />;
  }
}
