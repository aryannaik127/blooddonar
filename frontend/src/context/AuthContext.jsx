import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('bdf_token');
    if (!token) { setLoading(false); return; }

    api.getMe()
      .then(data => { setUser(data); setBackendError(null); })
      .catch((err) => {
        // Don't clear token on network errors — the backend might just be waking up
        if (err.message.includes('Cannot connect') || err.message.includes('Network error') || err.message.includes('not configured')) {
          setBackendError(err.message);
          console.warn('⚠️ Backend unreachable during session restore:', err.message);
        } else {
          api.clearToken();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setBackendError(null);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.register(payload);
    setUser(data.user);
    setBackendError(null);
    return data;
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setBackendError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data);
      setBackendError(null);
      return data;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshUser, backendError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
