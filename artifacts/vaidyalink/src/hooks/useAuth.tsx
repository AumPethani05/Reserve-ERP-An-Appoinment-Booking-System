import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'patient' | 'provider' | 'admin';
  is_verified: boolean;
  provider?: { id: number; business_name: string; is_onboarded: boolean; is_approved: boolean };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; phone: string; password: string; full_name: string; role: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      } else {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem('accessToken', refreshData.accessToken);
          const retryRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${refreshData.accessToken}` },
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            setUser(retryData.user);
            return retryData.user;
          } else {
            setUser(null);
            localStorage.removeItem('accessToken');
          }
        } else {
          setUser(null);
          localStorage.removeItem('accessToken');
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    if (data.user.role === 'admin') navigate('/admin');
    else if (data.user.role === 'provider') {
      if (!data.user.provider?.is_onboarded) navigate('/onboarding');
      else navigate('/dashboard');
    } else navigate('/businesses');
  };

  const signup = async (signupData: { email: string; phone: string; password: string; full_name: string; role: string }) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('pendingVerificationEmail', signupData.email);
    setUser(data.user);
    navigate(`/verify-otp?email=${encodeURIComponent(signupData.email)}`);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
