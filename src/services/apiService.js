// services/apiService.js
import { BASE_URL } from '../constants/Constants';

class ApiService {
  constructor() {
    this.baseURL = BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      requiresAuth = true,
      ...restOptions
    } = options;

    // Get token from localStorage or context
    const token = localStorage.getItem('authToken');
    
    // Check if data is FormData
    const isFormData = data instanceof FormData;

    // Prepare headers
    const defaultHeaders = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(requiresAuth && token && { 'Authorization': `Bearer ${token}` }),
      ...headers,
    };

    // Prepare request config
    const config = {
      method,
      headers: defaultHeaders,
      ...restOptions,
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      config.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle unauthorized responses (skip for signin - wrong password is not session expiry)
      if (response.status === 401 || response.status === 403) {
        const isSigninRequest = endpoint.includes('/auth/signin') || endpoint.includes('/signin');
        if (isSigninRequest) {
          const errorData = await response.json().catch(() => ({}));
          const err = new Error(errorData.message || 'Invalid credentials');
          err.response = { status: response.status, data: errorData };
          throw err;
        }
        this.handleUnauthorized();
        throw new Error('Authentication required');
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorData);
        } catch {
          parsedError = { error: errorData };
        }
        
        const error = new Error(`HTTP ${response.status}: ${errorData}`);
        error.response = {
          status: response.status,
          data: parsedError
        };
        throw error;
      }

      // Parse successful response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
      
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Handle unauthorized access
  handleUnauthorized() {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Redirect to login
    if (window.location.pathname !== '/signin') {
      window.location.href = '/signin';
    }
  }

  // Specific HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { method: 'POST', data, ...options });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { method: 'PUT', data, ...options });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, { method: 'PATCH', data, ...options });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // File upload method
  async upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      data: formData,
      ...options,
    });
  }
}

// Create singleton instance
export const apiService = new ApiService();