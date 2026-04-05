import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';

// Define types for our authentication context
interface User {
  id: string;
  name: string;
  email: string;
  groups: string[];
  roles: string[];
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider component that manages authentication state
 * Uses NextAuth for the AI Homelab ecosystem
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const router = useRouter();

  // Constants for authentication
  const TOKEN_STORAGE_KEY = 'ai_homelab_auth_token';
  const USER_STORAGE_KEY = 'ai_homelab_user';
  
  // Development mode bypass
  const DEVELOPMENT_MODE = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  // Get NextAuth session
  const { data: session, status: sessionStatus } = useSession();

  // Sync NextAuth session with AuthContext state
  useEffect(() => {
    if (sessionStatus === 'loading') {
      setIsLoading(true);
      return;
    }

    if (sessionStatus === 'authenticated' && session?.user) {
      // Map NextAuth session to AuthContext user
      const nextAuthUser: User = {
        id: (session.user as any).id || session.user.email || 'unknown',
        name: session.user.name || 'User',
        email: session.user.email || '',
        groups: (session.user as any).groups || [],
        roles: (session.user as any).roles || [],
        picture: session.user.image || undefined,
      };
      
      setUser(nextAuthUser);
      setIsAuthenticated(true);
      setToken('nextauth-session'); // Placeholder token for compatibility
      setIsLoading(false);
    } else if (sessionStatus === 'unauthenticated') {
      clearAuthState();
      setIsLoading(false);
    }
  }, [session, sessionStatus]);

  // Set up axios interceptor to include authentication token in requests
  const setupAxiosInterceptors = (authToken: string) => {
    axios.interceptors.request.use(
      (config) => {
        if (authToken && config.headers) {
          config.headers['Authorization'] = `Bearer ${authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  };

  // Clear authentication state
  const clearAuthState = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Initiate login process - redirect to NextAuth signin page
  const login = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    window.location.href = '/auth/signin';
  };

  // Handle OAuth callback - NextAuth handles this automatically
  // This is kept for interface compatibility but is a no-op
  const handleCallback = async (_code: string): Promise<void> => {
    // NextAuth handles OAuth callbacks automatically via /api/auth/callback/[provider]
    // This function is kept for backward compatibility with components that may call it
    console.warn('handleCallback is deprecated - NextAuth handles callbacks automatically');
  };

  // Handle logout - use NextAuth signout
  const logout = async (): Promise<void> => {
    try {
      // Track logout event
      if (user) {
        try {
          await axios.post('/api/telemetry', {
            category: 'authentication',
            action: 'logout',
            label: user.email,
            value: 1
          });
        } catch (error) {
          console.error('Failed to track authentication event:', error);
        }
      }
      
      // Clear authentication state
      clearAuthState();
      
      // Use NextAuth signOut function
      await nextAuthSignOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Check if user has the specified permission
    // This is a simplified implementation - in a real app, you might have a more complex permission system
    return user.roles.includes(permission) || 
           user.groups.includes('Administrators') || 
           user.groups.includes('MCP Admins');
  };

  // Context value
  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout,
    handleCallback,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
