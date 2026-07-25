import { z } from 'zod';

/**
 * Sanitize strings to prevent HTML/XSS injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Zod Schemas for API Input Validation
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DRIVER', 'PUBLIC']),
});

export const emergencyStartSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  destinationName: z.string().min(1, 'Destination name is required'),
  destinationLatitude: z.number({ required_error: 'Latitude is required' }),
  destinationLongitude: z.number({ required_error: 'Longitude is required' }),
});
