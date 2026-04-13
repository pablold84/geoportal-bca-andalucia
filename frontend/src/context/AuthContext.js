import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from '../config';
import { registerLogoutCallback } from '../utils/fetchWithAuth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const expiryTimerRef = useRef(null);

  const clearExpiryTimer = () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  };

  const scheduleExpiryLogout = (exp) => {
    clearExpiryTimer();
    if (!exp) return;
    const msRestantes = (exp * 1000) - Date.now();
    if (msRestantes <= 0) return;
    expiryTimerRef.current = setTimeout(() => {
      logout(false);
    }, msRestantes);
  };

  const decodeAndSetUser = (token) => {
    try {
      const decoded = jwtDecode(token);
      const userData = {
        username: decoded.sub,
        role: decoded.role,
        requiresPasswordChange: decoded.requires_password_change || false,
        exp: decoded.exp
      };
      setUser(userData);
      scheduleExpiryLogout(decoded.exp);
      return userData;
    } catch {
      return null;
    }
  };

  const logout = async (callServer = true) => {
    clearExpiryTimer();
    if (callServer) {
      try {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch {
        // ignorar errores de red en logout
      }
    }
    setUser(null);
  };

  useEffect(() => {
    registerLogoutCallback(() => logout(false));
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch(`${API_BASE}/me`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser({
            username: data.username,
            role: data.role,
            requiresPasswordChange: data.requires_password_change || false,
            exp: data.exp
          });
          scheduleExpiryLogout(data.exp);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();

    return () => clearExpiryTimer();
  }, []);

  const login = (token) => {
    return decodeAndSetUser(token);
  };

  const updateToken = (token) => {
    return decodeAndSetUser(token);
  };

  const canEdit = () => user?.role === 'admin' || user?.role === 'edicion';
  const canUseTools = () => user?.role === 'admin';
  const isAdmin = () => user?.role === 'admin';
  const requiresPasswordChange = () => user?.requiresPasswordChange === true;

  const value = {
    user,
    login,
    logout,
    updateToken,
    loading,
    canEdit,
    canUseTools,
    isAdmin,
    requiresPasswordChange
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};