import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiError, authApi, setOnUnauthorizedCallback } from '../services/api';
import { LoginInput, RegisterInput, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    setOnUnauthorizedCallback(handleUnauthorized);
    return () => setOnUnauthorizedCallback(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        setUser(response.user);
        setToken(storedToken);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (input: LoginInput) => {
    const response = await authApi.login(input);
    if (response.token) {
      localStorage.setItem('token', response.token);
      setToken(response.token);
    }
    setUser(response.user);
  };

  const register = async (input: RegisterInput) => {
    const response = await authApi.register(input);
    if (response.token) {
      localStorage.setItem('token', response.token);
      setToken(response.token);
    }
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout backend errors (e.g. already revoked)
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
