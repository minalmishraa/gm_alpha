'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import type { VehicleType, UserRole } from '@/lib/types';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';

export function RegisterForm() {
  const { setCurrentView } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('PUBLIC');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    vehicleNumber: '', vehicleType: 'AMBULANCE' as VehicleType, licenseNumber: '',
  });

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Registration failed');
        return;
      }

      toast.success('Registration successful! Please sign in.');
      if (role === 'DRIVER') {
        toast.info('Your driver account needs admin verification before you can start emergencies.');
      }
      setCurrentView('login');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🚑</div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-muted-foreground">Register for the SERIRAS emergency response system</p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign Up</CardTitle>
            <CardDescription>Choose your role and fill in your details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">🚑 Emergency Driver</SelectItem>
                  <SelectItem value="PUBLIC">👤 Public User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input placeholder="John Doe" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="name@example.com" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+977-98XXXXXXXX" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={(e) => updateForm('password', e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password *</Label>
              <Input type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => updateForm('confirmPassword', e.target.value)} />
            </div>

            {role === 'DRIVER' && (
              <>
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Driver Information</p>
                  <div className="space-y-2">
                    <Label>Vehicle Number</Label>
                    <Input placeholder="KA 101 JA 1234" value={form.vehicleNumber} onChange={(e) => updateForm('vehicleNumber', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle Type</Label>
                    <Select value={form.vehicleType} onValueChange={(v) => updateForm('vehicleType', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(VEHICLE_TYPE_CONFIG).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.emoji} {val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input placeholder="DL-2024-XXX" value={form.licenseNumber} onChange={(e) => updateForm('licenseNumber', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <Button className="w-full" onClick={handleRegister} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create Account
            </Button>

            <div className="text-center">
              <Button variant="link" onClick={() => setCurrentView('login')}>
                <ArrowLeft className="h-3 w-3 mr-1" /> Already have an account? Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
