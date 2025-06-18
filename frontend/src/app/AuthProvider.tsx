"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, User } from '@/types/auth';
import { loginUser, registerUser, getCurrentUser, updateApiKey } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
console.log('AuthProvider API_BASE_URL:', API_BASE_URL);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    console.log('AuthProvider mounted successfully');
    
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedApiKey = localStorage.getItem('apiKey');
        
        console.log('Found stored token:', !!storedToken);
        console.log('Found stored API key:', !!storedApiKey);
        
        // Restore API key first (synchronous)
        if (storedApiKey) {
          setApiKeyState(storedApiKey);
          console.log('API key restored from localStorage');
        }
        
        // Then handle token (asynchronous)
        if (storedToken) {
          setToken(storedToken);
          // Try to get current user with timeout
          try {
            console.log('Attempting to get current user...');
            const user = await getCurrentUser(storedToken);
            setUser(user);
            console.log('User restored from token:', user);
          } catch (error) {
            console.log('Token invalid, clearing...', error);
            // Token is invalid, clear it
            localStorage.removeItem('token');
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        console.log('Auth initialization complete');
        setLoading(false);
      }
    };
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timeout, setting loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout
    
    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);
  
  // Sync token to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);
  
  // Sync apiKey to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (apiKey) {
      localStorage.setItem('apiKey', apiKey);
    } else {
      localStorage.removeItem('apiKey');
    }
  }, [apiKey]);

  useEffect(() => {
    if (user) {
      // API key state is managed separately from user object
      // since backend doesn't return the actual API key
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
    const data = await loginUser(email, password);
    setToken(data.access_token);
    const user = await getCurrentUser(data.access_token);
      console.log('Login - user data received:', user);
    setUser(user);
      
      // On login, check for a key in localStorage first, then from the user object.
      const storedApiKey = localStorage.getItem('apiKey');
      const keyToSet = storedApiKey || user.api_key || null;
      setApiKeyState(keyToSet);
      if(keyToSet) {
        localStorage.setItem('apiKey', keyToSet);
      } else {
        localStorage.removeItem('apiKey');
      }
    } catch (err: any) {
      if (err?.response && err.response.data && err.response.data.detail) {
        throw new Error(err.response.data.detail);
      }
      throw new Error(err?.message || "Login failed");
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
    await registerUser(name, email, password);
    await login(email, password);
    } catch (err: any) {
      if (err?.response && err.response.data && err.response.data.detail) {
        throw new Error(err.response.data.detail);
      }
      throw new Error(err?.message || "Registration failed");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setApiKeyState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
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
      if (key) {
        localStorage.setItem('apiKey', key);
      } else {
        localStorage.removeItem('apiKey');
      }

    if (token) {
      try {
        const updatedUser = await updateApiKey(key, token);
        setUser(updatedUser);
      } catch (e) {
        console.error('Failed to update API key in backend', e);
        // Optional: handle UI feedback for the user
      }
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    try {
    await fetch(`${API_BASE_URL}/user/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    logout();
    } catch (e) {
      console.error('Failed to delete account', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, apiKey, setApiKey, login, register, logout, refreshUser, deleteAccount, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}; 