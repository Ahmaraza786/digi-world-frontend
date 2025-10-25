// hooks/useApi.js
import { useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiService } from '../services/apiService';

export const useApi = () => {
  const { logout } = useAuth();

  // Enhanced request method with auth context integration
  const request = useCallback(async (endpoint, options = {}) => {
    try {
      return await apiService.request(endpoint, options);
    } catch (error) {
      if (error.message === 'Authentication required') {
        logout(); // Use auth context logout
      }
      throw error;
    }
  }, [logout]);

  // Enhanced HTTP methods
  const get = useCallback((endpoint, options = {}) => 
    request(endpoint, { method: 'GET', ...options }), [request]);

  const post = useCallback((endpoint, data, options = {}) => 
    request(endpoint, { method: 'POST', data, ...options }), [request]);

  const put = useCallback((endpoint, data, options = {}) => 
    request(endpoint, { method: 'PUT', data, ...options }), [request]);

  const patch = useCallback((endpoint, data, options = {}) => 
    request(endpoint, { method: 'PATCH', data, ...options }), [request]);

  const del = useCallback((endpoint, options = {}) => 
    request(endpoint, { method: 'DELETE', ...options }), [request]);

  const upload = useCallback((endpoint, formData, options = {}) => 
    request(endpoint, { method: 'POST', data: formData, ...options }), [request]);

  return {
    request,
    get,
    post,
    put,
    patch,
    del,
    upload,
  };
};