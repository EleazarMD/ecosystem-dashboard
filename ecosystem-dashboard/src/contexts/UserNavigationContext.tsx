/**
 * User Navigation Context
 * 
 * Provides filtered navigation based on user type (child, parent, admin)
 * Used by DashboardLayout to show appropriate navigation items
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface ChildService {
  id: string;
  label: string;
  path: string;
  emoji: string;
  description: string;
  color: string;
}

interface NavItem {
  label: string;
  path: string;
  icon?: string;
  domain?: string;
}

interface UserNavigationState {
  userType: 'child' | 'parent' | 'admin' | 'user' | null;
  homePath: string;
  services: ChildService[];
  navigationItems: NavItem[];
  showFullNav: boolean;
  isParent: boolean;
  childCount: number;
  controlsActive: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const defaultState: UserNavigationState = {
  userType: null,
  homePath: '/dashboard',
  services: [],
  navigationItems: [],
  showFullNav: true,
  isParent: false,
  childCount: 0,
  controlsActive: true,
  loading: true,
  error: null,
  refresh: async () => {},
};

const UserNavigationContext = createContext<UserNavigationState>(defaultState);

export function UserNavigationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<UserNavigationState>(defaultState);

  const fetchNavigation = async () => {
    if (status !== 'authenticated' || !session?.user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const res = await fetch('/api/user/navigation');
      const data = await res.json();

      if (res.ok) {
        setState({
          userType: data.userType,
          homePath: data.homePath,
          services: data.services || [],
          navigationItems: data.navigationItems || [],
          showFullNav: data.showFullNav ?? true,
          isParent: data.isParent ?? false,
          childCount: data.childCount ?? 0,
          controlsActive: data.controlsActive ?? true,
          loading: false,
          error: null,
          refresh: fetchNavigation,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error,
        }));
      }
    } catch (error) {
      console.error('[UserNavigationContext] Failed to fetch navigation:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load navigation',
      }));
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNavigation();
    } else if (status === 'unauthenticated') {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [status, session]);

  return (
    <UserNavigationContext.Provider value={{ ...state, refresh: fetchNavigation }}>
      {children}
    </UserNavigationContext.Provider>
  );
}

export function useUserNavigation() {
  const context = useContext(UserNavigationContext);
  if (!context) {
    throw new Error('useUserNavigation must be used within UserNavigationProvider');
  }
  return context;
}

export default UserNavigationContext;
