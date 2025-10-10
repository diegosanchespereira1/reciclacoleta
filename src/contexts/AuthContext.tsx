import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import ApiService from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: 'collector' | 'admin') => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing token and verify it
        const result = await ApiService.verifyToken();
        if (result?.user) {
          setUser(result.user);
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        ApiService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await ApiService.login(email, password);
      setUser(result.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
  };

  const register = async (name: string, email: string, password: string, role: 'collector' | 'admin'): Promise<boolean> => {
    try {
      const result = await ApiService.register(email, password, name, role);
      setUser(result.user);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
