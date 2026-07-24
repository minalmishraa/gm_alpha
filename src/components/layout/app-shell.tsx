'use client';

import { useAppStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Monitor,
  AlertTriangle,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  Truck,
  History,
  User,
  Lightbulb,
  Radio,
} from 'lucide-react';
import type { AppView } from '@/lib/types';
import { VEHICLE_TYPE_CONFIG, ROLE_CONFIG } from '@/lib/constants';
import { ContentRouter } from '@/app/page';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  view: AppView;
}

function getNavItems(role: string): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'admin-dashboard' },
      { label: 'Live Tracking', icon: <Monitor className="h-4 w-4" />, view: 'admin-dashboard' },
      { label: 'Drivers', icon: <Truck className="h-4 w-4" />, view: 'admin-drivers' },
      { label: 'Display Boards', icon: <Radio className="h-4 w-4" />, view: 'admin-boards' },
      { label: 'Emergencies', icon: <AlertTriangle className="h-4 w-4" />, view: 'admin-emergencies' },
      { label: 'Hospitals', icon: <Building2 className="h-4 w-4" />, view: 'admin-hospitals' },
      { label: 'Users', icon: <Users className="h-4 w-4" />, view: 'admin-users' },
      { label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, view: 'admin-analytics' },
      { label: 'Settings', icon: <Settings className="h-4 w-4" />, view: 'admin-settings' },
    ];
  } else if (role === 'DRIVER') {
    return [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'driver-dashboard' },
      { label: 'Emergency History', icon: <History className="h-4 w-4" />, view: 'driver-history' },
      { label: 'Profile', icon: <User className="h-4 w-4" />, view: 'driver-profile' },
    ];
  } else {
    return [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, view: 'public-dashboard' },
      { label: 'Nearby Alerts', icon: <AlertTriangle className="h-4 w-4" />, view: 'public-alerts' },
      { label: 'Emergency Tips', icon: <Lightbulb className="h-4 w-4" />, view: 'public-tips' },
      { label: 'Profile', icon: <User className="h-4 w-4" />, view: 'public-profile' },
    ];
  }
}

export function AppShell() {
  const { currentView, setCurrentView, currentUser, setCurrentUser, setAuthenticated, sidebarOpen, setSidebarOpen, unreadCount } = useAppStore();
  const { theme, setTheme } = useTheme();

  if (!currentUser) return null;

  const navItems = getNavItems(currentUser.role);
  const roleConfig = ROLE_CONFIG[currentUser.role];
  const initials = currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthenticated(false);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚑</span>
            <span className="font-bold text-sm">SERIRAS</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative" onClick={() => setCurrentView('public-alerts')}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 lg:top-0 left-0 z-50 lg:z-10 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Sidebar Header */}
          <div className="h-14 flex items-center gap-3 px-4 border-b border-sidebar-border">
            <span className="text-2xl">🚑</span>
            <div>
              <h1 className="font-bold text-sm tracking-wide">SERIRAS</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Emergency Response System</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-2 space-y-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
            {navItems.map((item) => (
              <Button
                key={item.view}
                variant={currentView === item.view ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 px-3 h-10 text-sm"
                onClick={() => {
                  setCurrentView(item.view);
                  setSidebarOpen(false);
                }}
              >
                {item.icon}
                {item.label}
                {item.view === 'admin-drivers' && currentUser.role === 'ADMIN' && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5">!</Badge>
                )}
              </Button>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{currentUser.name}</p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">{roleConfig.label}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Desktop Header */}
          <header className="hidden lg:flex sticky top-0 z-10 h-14 items-center justify-between px-6 border-b bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                {roleConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">Welcome back, {currentUser.name.split(' ')[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={() => setCurrentView(currentUser.role === 'ADMIN' ? 'admin-emergencies' : 'public-alerts')}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Content area */}
          <div className="p-4 lg:p-6">
            <ContentRouter />
          </div>
        </main>
      </div>
    </div>
  );
}
