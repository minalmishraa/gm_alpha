// Core types for SERIRAS application

export type UserRole = 'ADMIN' | 'DRIVER' | 'PUBLIC';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type VehicleType = 'AMBULANCE' | 'FIRE_BRIGADE' | 'POLICE' | 'DISASTER_RESPONSE';
export type EmergencyStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type BoardStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type NotificationType = 'ALERT' | 'INFO' | 'WARNING';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  role: UserRole;
  photo: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  driver?: Driver;
}

export interface Driver {
  id: string;
  userId: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  licenseNumber: string;
  verified: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  online: boolean;
  activeEmergency: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  emergencies?: Emergency[];
}

export interface Board {
  id: string;
  boardName: string;
  latitude: number;
  longitude: number;
  address: string | null;
  status: BoardStatus;
  lastHeartbeat: string;
  displayMessage: string | null;
  eta: number | null;
  direction: string | null;
  radius: number;
  createdAt: string;
  updatedAt: string;
}

export interface Emergency {
  id: string;
  driverId: string;
  vehicleType: VehicleType;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  route: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  speed: number | null;
  distanceRemaining: number | null;
  eta: number | null;
  startedAt: string;
  endedAt: string | null;
  status: EmergencyStatus;
  createdAt: string;
  updatedAt: string;
  driver?: Driver;
}

export interface Notification {
  id: string;
  receiverId: string;
  title: string;
  body: string;
  type: NotificationType | null;
  read: boolean;
  timestamp: string;
}

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  beds: number;
  contact: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todayEmergencies: number;
  onlineVehicles: number;
  offlineVehicles: number;
  connectedBoards: number;
  offlineBoards: number;
  activeEmergencies: number;
  totalDrivers: number;
  totalUsers: number;
  pendingVerifications: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// View types for client-side routing
export type AppView =
  | 'login'
  | 'register'
  | 'admin-dashboard'
  | 'admin-drivers'
  | 'admin-boards'
  | 'admin-emergencies'
  | 'admin-hospitals'
  | 'admin-analytics'
  | 'admin-users'
  | 'admin-settings'
  | 'driver-dashboard'
  | 'driver-history'
  | 'driver-profile'
  | 'public-dashboard'
  | 'public-alerts'
  | 'public-tips'
  | 'public-profile'
  | 'board-display';

// Login/Register forms
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}
