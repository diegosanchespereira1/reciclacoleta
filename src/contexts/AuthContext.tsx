import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { DatabaseService } from '../services/database';
import { CollectionPointService } from '../services/collectionPointService';

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
    // Initialize database with sample data
    DatabaseService.initializeSampleData();
    CollectionPointService.initializeSampleData();
    
    // Check for existing session
    const savedUser = localStorage.getItem('recicla_coleta_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await DatabaseService.getUserByEmail(email);
      if (foundUser && foundUser.password === password) {
        setUser(foundUser);
        localStorage.setItem('recicla_coleta_current_user', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('recicla_coleta_current_user');
  };

  const register = async (name: string, email: string, password: string, role: 'collector' | 'admin'): Promise<boolean> => {
    try {
      const existingUser = await DatabaseService.getUserByEmail(email);
      if (existingUser) {
        return false; // User already exists
      }

      const newUser = await DatabaseService.createUser({
        name,
        email,
        password,
        role
      });

      setUser(newUser);
      localStorage.setItem('recicla_coleta_current_user', JSON.stringify(newUser));
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
