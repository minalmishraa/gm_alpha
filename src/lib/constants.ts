import {
  type VehicleType,
  type EmergencyStatus,
  type UserRole,
  type BoardStatus,
  type NotificationType,
} from './types';

// Emergency system constants
export const GPS_UPDATE_INTERVAL = 2000; // 2 seconds
export const BOARD_CHECK_INTERVAL = 5000; // 5 seconds
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const DEFAULT_BOARD_RADIUS = 500; // meters
export const USER_NOTIFICATION_RADIUS = 1000; // meters

// Default center location (Kathmandu, Nepal)
export const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];
export const DEFAULT_ZOOM = 13;

// Vehicle type labels and icons
export const VEHICLE_TYPE_CONFIG: Record<VehicleType, { label: string; emoji: string; color: string }> = {
  AMBULANCE: { label: 'Ambulance', emoji: '🚑', color: '#DC2626' },
  FIRE_BRIGADE: { label: 'Fire Brigade', emoji: '🚒', color: '#F97316' },
  POLICE: { label: 'Police', emoji: '🚔', color: '#3B82F6' },
  DISASTER_RESPONSE: { label: 'Disaster Response', emoji: '🛟', color: '#8B5CF6' },
};

// Emergency status config
export const EMERGENCY_STATUS_CONFIG: Record<EmergencyStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#DC2626' },
  COMPLETED: { label: 'Completed', color: '#16A34A' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280' },
};

// Role config
export const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  ADMIN: { label: 'Administrator', color: '#8B5CF6' },
  DRIVER: { label: 'Emergency Driver', color: '#3B82F6' },
  PUBLIC: { label: 'Public User', color: '#16A34A' },
};

// Board status config
export const BOARD_STATUS_CONFIG: Record<BoardStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: '#16A34A' },
  INACTIVE: { label: 'Inactive', color: '#6B7280' },
  MAINTENANCE: { label: 'Maintenance', color: '#F59E0B' },
};

// Notification type config
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; color: string }> = {
  ALERT: { label: 'Alert', color: '#DC2626' },
  INFO: { label: 'Info', color: '#3B82F6' },
  WARNING: { label: 'Warning', color: '#F59E0B' },
};

// Emergency tips for public users
export const EMERGENCY_TIPS = [
  {
    title: 'Give Way to Emergency Vehicles',
    description: 'When you hear sirens or see flashing lights, safely pull over to the right side of the road and stop until the emergency vehicle passes.',
    icon: '🚨',
  },
  {
    title: 'Keep Intersections Clear',
    description: 'Never block an intersection. Emergency vehicles need clear paths to reach their destinations quickly.',
    icon: '🛣️',
  },
  {
    title: 'Stay Calm and Signal',
    description: 'Use your turn signals to indicate your intentions. Stay calm and make predictable movements.',
    icon: '🤝',
  },
  {
    title: 'Don\'t Follow Emergency Vehicles',
    description: 'Never tailgate or follow an emergency vehicle. This is dangerous and illegal in most jurisdictions.',
    icon: '🚫',
  },
  {
    title: 'Emergency Numbers',
    description: 'Keep emergency numbers saved: Ambulance - 102, Fire Brigade - 101, Police - 100, Disaster Response - 115.',
    icon: '📞',
  },
  {
    title: 'Move to the Right',
    description: 'In countries with right-hand traffic, move to the right. In left-hand traffic countries, move to the left.',
    icon: '➡️',
  },
  {
    title: 'Pedestrian Awareness',
    description: 'If you are a pedestrian, stay on the sidewalk. Never walk into the path of an approaching emergency vehicle.',
    icon: '🚶',
  },
  {
    title: 'Report Accidents',
    description: 'If you see an accident, call emergency services immediately. Provide clear location details and the nature of the emergency.',
    icon: '📋',
  },
];

// Sample locations for Kathmandu
export const SAMPLE_LOCATIONS = {
  hospitals: [
    { name: 'Tribhuvan University Teaching Hospital', lat: 27.7172, lng: 85.3180 },
    { name: 'Patan Hospital', lat: 27.6802, lng: 85.3179 },
    { name: 'Bir Hospital', lat: 27.7103, lng: 85.3126 },
    { name: 'Kathmandu Medical College', lat: 27.7175, lng: 85.3345 },
    { name: 'Norvic International Hospital', lat: 27.7168, lng: 85.3288 },
  ],
  landmarks: [
    { name: 'Thamel', lat: 27.7147, lng: 85.3108 },
    { name: 'Durbar Square', lat: 27.7069, lng: 85.3105 },
    { name: 'Boudhanath Stupa', lat: 27.7222, lng: 85.3614 },
    { name: 'Pashupatinath Temple', lat: 27.7105, lng: 85.3465 },
    { name: 'Nagarkot Viewpoint', lat: 27.7833, lng: 85.5167 },
  ],
};
