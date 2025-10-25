import React, { createContext, useContext, useState, useEffect } from 'react';
import { NAVIGATION_CONFIG } from '../constants/NavigationConfig';


export const SCREEN_ROUTES = {
  user: '/users',
  dashboard: '/dashboard',
  reports: '/reports',
  settings: '/settings',
};

const DEFAULT_ROUTE = '/dashboard';

const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  // Login function
  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    
    // Store in localStorage for persistence
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

     window.location.href = '/signin';
  };

  // Check if user has specific permission
  const hasPermission = (screen, permission) => {
    if (!user || !user.permissions) return false;
    
    // Check if user has manage permission for all screens
    if (user.permissions['*']?.includes('manage')) return true;
    
    // Check specific screen permissions
    return user.permissions[screen]?.includes(permission) || false;
  };

  // Check if user has any of the provided permissions
  const hasAnyPermission = (screen, permissions) => {
    return permissions.some(permission => hasPermission(screen, permission));
  };

  // Check if user has a specific role
  const hasRole = (roleName) => {
    return user && user.role && user.role.name === roleName;
  };
  // Update the getRedirectRoute function
const getRedirectRoute = (userData = null) => {
  const targetUser = userData || user;
  
  if (!targetUser || !targetUser.permissions) {
    return DEFAULT_ROUTE;
  }
  
  // Get available navigation items
  const availableItems = getAvailableNavigationItems(targetUser);
  
  // If user has accessible modules, redirect to the first one
  if (availableItems.length > 0) {
    return availableItems[0].routerLink;
  }
  
  // Fallback to dashboard or a "no access" page
  return DEFAULT_ROUTE;
};
  const getAvailableNavigationItems = (userData = null) => {
  const targetUser = userData || user;
  
  if (!targetUser || !targetUser.permissions) {
    return [];
  }

  const availableItems = [];

  // Check each configured navigation item
  Object.entries(NAVIGATION_CONFIG).forEach(([tabName, navConfig]) => {
    // Simply check if the tab name exists in permissions (regardless of permissions array content)
    if (targetUser.permissions.hasOwnProperty(tabName)) {
      availableItems.push({
        key: tabName,
        ...navConfig
      });
    }
  });

  return availableItems;
};


  const value = {
    user,
    token,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasRole,
    getRedirectRoute,
    getAvailableNavigationItems,
    isAuthenticated: !!token,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth context use hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};