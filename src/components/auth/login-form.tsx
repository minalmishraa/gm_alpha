'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROLE_CONFIG } from '@/lib/constants';

const TEST_ACCOUNTS = [
  { label: 'Admin', email: 'admin@seriras.com', password: 'admin123', desc: 'Full system access' },
  { label: 'Driver', email: 'raj@seriras.com', password: 'driver123', desc: 'Ambulance driver' },
  { label: 'Public', email: 'ram@seriras.com', password: 'user123', desc: 'Regular user' },
];

export function LoginForm() {
  const { setCurrentUser, setAuthenticated, setCurrentView } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const e = loginEmail || email;
    const p = loginPassword || password;
    if (!e || !p) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }

      setCurrentUser(data.user);
      setAuthenticated(true);
      toast.success(`Welcome, ${data.user.name}!`);

      if (data.user.role === 'ADMIN') setCurrentView('admin-dashboard');
      else if (data.user.role === 'DRIVER') setCurrentView('driver-dashboard');
      else setCurrentView('public-dashboard');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-6xl"
          >
            🚑
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight">SERIRAS</h1>
          <p className="text-sm text-muted-foreground">
            Smart Emergency Response & Intelligent Roadside Alert System
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => handleLogin()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Sign In
            </Button>

            <div className="text-center">
              <Button variant="link" onClick={() => setCurrentView('register')}>
                Don&apos;t have an account? Register
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Test Accounts */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quick Access (Demo)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {TEST_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                className="justify-start text-left h-auto py-2 px-3"
                onClick={() => handleLogin(account.email, account.password)}
                disabled={loading}
              >
                <div className="flex-1">
                  <span className="font-medium text-sm">{account.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{account.email}</span>
                  <p className="text-xs text-muted-foreground">{account.desc}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
