import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loginRequest, signupRequest, fetchCurrentUser, fetchCurrentAdmin, logoutClient } from '../api/authApi';
import { fetchCart } from '../api/cartApi';
import { getStoredToken, getStoredRole, setStoredRole } from '../api/http';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!getStoredToken() || getStoredRole() === 'admin') {
      setCartCount(0);
      return;
    }
    try {
      const cart = await fetchCart();
      const n = cart.items.reduce((sum, line) => sum + line.quantity, 0);
      setCartCount(n);
    } catch {
      setCartCount(0);
    }
  }, []);

  const hydrateFromToken = useCallback(async () => {
    const role = getStoredRole();
    if (role === 'admin') {
      const me = await fetchCurrentAdmin();
      setAdmin(me);
      setUser(null);
      return;
    }
    if (role === 'user') {
      const me = await fetchCurrentUser();
      setUser(me);
      setAdmin(null);
      await refreshCart();
      return;
    }
    
    // No role stored, try user then admin
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setAdmin(null);
      setStoredRole('user');
      await refreshCart();
    } catch {
      const me = await fetchCurrentAdmin();
      setAdmin(me);
      setUser(null);
      setStoredRole('admin');
    }
  }, [refreshCart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getStoredToken()) {
        setUser(null);
        setAdmin(null);
        setLoading(false);
        return;
      }
      try {
        await hydrateFromToken();
      } catch (error) {
        console.error('Session hydration failed:', error);
        logoutClient();
        if (!cancelled) {
          setUser(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateFromToken]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    if (data.role === 'admin') {
      const me = await fetchCurrentAdmin();
      setAdmin(me);
      setUser(null);
      setCartCount(0);
      return 'admin';
    }
    const me = await fetchCurrentUser();
    setUser(me);
    setAdmin(null);
    await refreshCart();
    return 'user';
  }, [refreshCart]);

  const register = useCallback(async (userData) => {
    const { email, password, name } = userData;
    return await signupRequest(email, password, name || null);
  }, []);

  const logout = useCallback(() => {
    logoutClient();
    setUser(null);
    setAdmin(null);
    setCartCount(0);
  }, []);

  const isAdmin = useMemo(() => !!admin, [admin]);
  const isAuthenticated = useMemo(() => !!(user || admin), [user, admin]);

  const value = useMemo(() => ({
    user: user || admin,
    admin,
    isAdmin,
    loading,
    cartCount,
    login,
    register,
    logout,
    refreshCart,
    isAuthenticated,
  }), [user, admin, isAdmin, loading, cartCount, login, register, logout, refreshCart, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

