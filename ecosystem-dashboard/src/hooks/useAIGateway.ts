/**
 * AI Gateway Hook
 * 
 * This hook provides an authenticated axios client for making requests to the AI Gateway.
 * It handles authentication with Authentik and maintains the auth token.
 */

import { useState, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../context/AuthContext';

export const useAIGateway = () => {
  const [client, setClient] = useState<AxiosInstance | null>(null);
  const { token, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setClient(null);
      return;
    }
    
    // Create an axios instance with the auth token
    const axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:3000',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Add response interceptor for token refresh
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // This would typically trigger a token refresh via the AuthContext
            // For now, we'll just reject the promise
            return Promise.reject(error);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    setClient(axiosInstance);
  }, [token, isAuthenticated]);
  
  return { client };
};
