import { create } from 'zustand';
import type { AppView, User, DashboardStats, Emergency, Driver, Board, Hospital, Notification } from './types';

interface AppState {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  previousView: AppView | null;

  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Dashboard stats
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats) => void;

  // Live data
  activeEmergencies: Emergency[];
  setActiveEmergencies: (emergencies: Emergency[]) => void;
  updateEmergency: (id: string, data: Partial<Emergency>) => void;
  addEmergency: (emergency: Emergency) => void;
  removeEmergency: (id: string) => void;

  drivers: Driver[];
  setDrivers: (drivers: Driver[]) => void;
  updateDriver: (id: string, data: Partial<Driver>) => void;

  boards: Board[];
  setBoards: (boards: Board[]) => void;
  updateBoard: (id: string, data: Partial<Board>) => void;

  hospitals: Hospital[];
  setHospitals: (hospitals: Hospital[]) => void;

  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Driver-specific
  driverActiveEmergency: Emergency | null;
  setDriverActiveEmergency: (emergency: Emergency | null) => void;
  driverLocation: { lat: number; lng: number } | null;
  setDriverLocation: (location: { lat: number; lng: number } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'login',
  setCurrentView: (view) =>
    set((state) => ({ currentView: view, previousView: state.currentView })),
  previousView: null,

  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  isAuthenticated: false,
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),

  // Dashboard stats
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // Live data
  activeEmergencies: [],
  setActiveEmergencies: (emergencies) => set({ activeEmergencies: emergencies }),
  updateEmergency: (id, data) =>
    set((state) => ({
      activeEmergencies: state.activeEmergencies.map((e) =>
        e.id === id ? { ...e, ...data } : e
      ),
    })),
  addEmergency: (emergency) =>
    set((state) => ({
      activeEmergencies: [emergency, ...state.activeEmergencies],
    })),
  removeEmergency: (id) =>
    set((state) => ({
      activeEmergencies: state.activeEmergencies.filter((e) => e.id !== id),
    })),

  drivers: [],
  setDrivers: (drivers) => set({ drivers }),
  updateDriver: (id, data) =>
    set((state) => ({
      drivers: state.drivers.map((d) =>
        d.id === id ? { ...d, ...data } : d
      ),
    })),

  boards: [],
  setBoards: (boards) => set({ boards }),
  updateBoard: (id, data) =>
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    })),

  hospitals: [],
  setHospitals: (hospitals) => set({ hospitals }),

  notifications: [],
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  unreadCount: 0,

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Driver-specific
  driverActiveEmergency: null,
  setDriverActiveEmergency: (emergency) => set({ driverActiveEmergency: emergency }),
  driverLocation: null,
  setDriverLocation: (location) => set({ driverLocation: location }),
}));
