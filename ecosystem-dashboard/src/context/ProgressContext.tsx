import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import logger from '../lib/logger';
import { getBrowserAHISClient } from '../lib/browser-ahis-client';

// Define Project interface locally since import is missing
interface Project {
  id: string;
  name: string;
  type: string;
  path: string;
  status: string;
  lastChecked?: string;
}

// 1. Define the shape of the context data
interface ProgressContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshProjects: () => void;
}

// 2. Create the context with a default value
export const ProgressContext = createContext<ProgressContextType>({
  projects: [],
  loading: true,
  error: null,
  refreshProjects: () => console.warn('ProgressProvider not found'),
});

// 3. Create a custom hook for easy consumption of the context
export const useProgress = () => useContext(ProgressContext);

// 4. Define the props for the provider component
interface ProgressProviderProps {
  children: ReactNode;
}

// 5. Create the provider component
export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useCallback ensures the function reference is stable across renders
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getBrowserAHISClient();
      if (client.getConnectionStatus() !== 'connected') {
        logger.info('[ProgressContext] AHIS client not connected, attempting to connect...');
        await client.connect();
        logger.info('[ProgressContext] AHIS client connected successfully.');
      }
      
      logger.info('[ProgressContext] Calling AHIS command: getProjects');
      const result = await client.executeCommand('getProjects', {});
      logger.info('[ProgressContext] Successfully fetched projects:', result);

      if (Array.isArray(result)) {
        setProjects(result);
      } else {
        logger.warn('[ProgressContext] Fetched projects data is not an array:', result);
        setProjects([]); // Ensure projects is always an array
      }
    } catch (err: any) {
      logger.error('[ProgressContext] Error fetching projects:', err);
      setError(err.message || 'An unknown error occurred while fetching projects.');
      setProjects([]); // Ensure projects is always an array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();

    // Set up WebSocket event listeners for real-time updates
    const handleProjectsUpdate = (data: any) => {
      logger.info('Received projects_updated event via WebSocket. Refetching projects...', data);
      fetchProjects(); // Refetch all projects to ensure data consistency
    };

    const handleError = (errorData: any) => {
      logger.error('Received error from AHIS server via WebSocket:', errorData);
      setError(errorData.message || 'A WebSocket error occurred.');
    };

    const client = getBrowserAHISClient();
    // Use the correct event subscription methods
    client.on('projects_updated', handleProjectsUpdate);
    client.on('error', handleError);

    // Cleanup function to unsubscribe from events on component unmount
    return () => {
      logger.info('[ProgressContext] Cleaning up WebSocket subscriptions.');
      client.off('projects_updated', handleProjectsUpdate);
      client.off('error', handleError);
    };
  }, [fetchProjects]);

  // The value object provided to consumers of the context
  const value = {
    projects,
    loading,
    error,
    refreshProjects: fetchProjects,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};
