import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  switchRole: (role: 'ADMIN' | 'OPERATIONS_MANAGER' | 'EXECUTIVE') => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      const access_token = res.data.access_token;
      const u = res.data.user;
      setToken(access_token);
      setUser(u);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(u));
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  };

  const switchRole = (role: 'ADMIN' | 'OPERATIONS_MANAGER' | 'EXECUTIVE') => {
    let mockUser: User;
    if (role === 'ADMIN') {
      mockUser = { id: 1, email: 'admin@routepilot.io', full_name: 'Dev Admin', role: 'ADMIN', executive_id: null };
    } else if (role === 'EXECUTIVE') {
      mockUser = { id: 3, email: 'executive@routepilot.io', full_name: 'Vikram Singh (E01)', role: 'EXECUTIVE', executive_id: 'E01' };
    } else {
      mockUser = { id: 2, email: 'manager@routepilot.io', full_name: 'Priya Sharma (Ops Lead)', role: 'OPERATIONS_MANAGER', executive_id: null };
    }
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
