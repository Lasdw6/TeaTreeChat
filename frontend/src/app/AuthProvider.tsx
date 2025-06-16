"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, User } from '@/types/auth';
import { loginUser, registerUser, getCurrentUser, updateApiKey } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('apiKey') : null;
    if (storedToken) {
      setToken(storedToken);
      getCurrentUser(storedToken)
        .then(setUser)
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        });
    }
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
      if (apiKey) {
        localStorage.setItem('apiKey', apiKey);
      } else {
        localStorage.removeItem('apiKey');
      }
    }
  }, [token, apiKey]);

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password);
    setToken(data.access_token);
    const user = await getCurrentUser(data.access_token);
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    await registerUser(name, email, password);
    await login(email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setApiKeyState(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const user = await getCurrentUser(token);
      setUser(user);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const setApiKey = async (key: string) => {
    setApiKeyState(key);
    if (token) {
      try {
        const updatedUser = await updateApiKey(key, token);
        setApiKeyState(updatedUser.api_key);
      } catch (e) {
        console.error('Failed to update API key in backend', e);
      }
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    await fetch('/api/user/me', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, token, apiKey, setApiKey, login, register, logout, refreshUser, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}; 