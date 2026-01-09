import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default values if context doesn't exist (for now)
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
      login: async () => {},
      register: async () => {},
      logout: () => {},
    };
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAdmin(userData.is_admin || userData.is_staff || userData.is_superuser || false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password, isAdminLogin = false) => {
    // TODO: Replace with actual API call
    // For now, just set a dummy user
    const dummyUser = {
      id: 1,
      username: username,
      email: `${username}@example.com`,
      is_admin: isAdminLogin,
      is_staff: isAdminLogin,
    };
    
    localStorage.setItem('user', JSON.stringify(dummyUser));
    setUser(dummyUser);
    setIsAdmin(isAdminLogin);
    
    return {
      user: dummyUser,
      tokens: {
        access: 'dummy-token',
        refresh: 'dummy-refresh',
      },
    };
  };

  const register = async (userData) => {
    // TODO: Replace with actual API call
    const dummyUser = {
      id: Date.now(),
      username: userData.username,
      email: userData.email,
      is_admin: false,
    };
    
    localStorage.setItem('user', JSON.stringify(dummyUser));
    setUser(dummyUser);
    setIsAdmin(false);
    
    return {
      user: dummyUser,
      tokens: {
        access: 'dummy-token',
        refresh: 'dummy-refresh',
      },
    };
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    isAdmin,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

