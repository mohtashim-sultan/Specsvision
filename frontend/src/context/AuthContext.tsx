import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loginRequest, signupRequest, fetchCurrentUser, fetchCurrentAdmin, logoutClient } from '../api/authApi';
import { fetchCart } from '../api/cartApi';
import { getStoredToken, getStoredRole, setStoredRole } from '../api/http';
import type { Admin, User } from '../types/api';

export type SessionRole = 'user' | 'admin';

type AuthContextType = {
  user: User | Admin | null;
  admin: Admin | null;
  isAdmin: boolean;
  loading: boolean;
  cartCount: number;
  login: (email: string, password: string) => Promise<SessionRole>;
  register: (userData: { email: string; password: string; name?: string | null }) => Promise<SessionRole>;
  logout: () => void;
  refreshCart: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
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

  const login = useCallback(async (email: string, password: string): Promise<SessionRole> => {
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

  const register = useCallback(async (userData: { email: string; password: string; name?: string | null }): Promise<SessionRole> => {
    const { email, password, name } = userData;
    // signupRequest stores the token, so the session has to be hydrated here exactly as
    // login does it — otherwise the user holds a valid token while the app still thinks
    // nobody is signed in.
    await signupRequest(email, password, name || null);
    const me = await fetchCurrentUser();
    setUser(me);
    setAdmin(null);
    await refreshCart();
    return 'user';
  }, [refreshCart]);

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

