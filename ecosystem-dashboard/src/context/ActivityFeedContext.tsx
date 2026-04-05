import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getBrowserAHISClient } from '../lib/browser-ahis-client';
import logger from '../lib/logger';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  category?: string;
  title?: string;
  description?: string;
  message?: string;
  source: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

interface ActivityFeedContextType {
  activities: ActivityEvent[];
  loading: boolean;
  error: string | null;
  refreshActivities: () => void;
}

export const ActivityFeedContext = createContext<ActivityFeedContextType>({
  activities: [],
  loading: true,
  error: null,
  refreshActivities: () => console.warn('ActivityFeedProvider not found'),
});

export const useActivityFeed = () => useContext(ActivityFeedContext);

interface ActivityFeedProviderProps {
  children: ReactNode;
}

export const ActivityFeedProvider: React.FC<ActivityFeedProviderProps> = ({ children }) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (retryCount = 0) => {
    const maxRetries = 2;
    setLoading(true);
    setError(null);
    try {
      // Use the API endpoint instead of AHIS client
      const response = await fetch('/api/mcp/activity-feed');

      if (!response.ok) {
        // Retry on 500 errors (server may still be initializing)
        if (response.status >= 500 && retryCount < maxRetries) {
          logger.warn(`[ActivityFeedContext] Server error ${response.status}, retrying (${retryCount + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchActivities(retryCount + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('[ActivityFeedContext] Response is not JSON, content-type:', contentType);
        setActivities([]);
        return;
      }

      const data = await response.json();
      logger.info('[ActivityFeedContext] Successfully fetched activity feed:', data);

      if (data && Array.isArray(data.activities)) {
        // Map API response to ActivityEvent format
        const mappedActivities = data.activities.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.description,
          message: item.description || item.title, // For backward compatibility
          source: item.source,
          priority: item.priority,
          status: item.status,
          metadata: item.metadata
        }));
        setActivities(mappedActivities);
      } else {
        logger.warn('[ActivityFeedContext] Invalid activity data format:', data);
        setActivities([]);
      }
    } catch (err: any) {
      logger.error('[ActivityFeedContext] Error fetching activity feed:', err);
      // Don't show error to user for non-critical activity feed failures
      // Just set empty activities and log the error
      setError(null); // Suppress error display for activity feed
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    // Set up a polling interval to refresh activities periodically in dev mode
    // In production, this would use WebSockets or SSE
    const intervalId = setInterval(() => {
      fetchActivities();
    }, 60000); // Refresh every minute

    // Try to subscribe to activity events if AHIS client is available
    try {
      const client = getBrowserAHISClient();
      if (client && client.isConnected()) {
        client.subscribeToEvents('activity_updated', () => {
          logger.info('Received activity_updated event. Refetching activities.');
          fetchActivities();
        });
      }
    } catch (err) {
      logger.warn('[ActivityFeedContext] Could not subscribe to AHIS events:', err);
    }

    return () => {
      clearInterval(intervalId);

      // Try to unsubscribe if client is available
      try {
        const client = getBrowserAHISClient();
        if (client && client.isConnected()) {
          client.unsubscribeFromEvents('activity_updated', () => { });
        }
      } catch (err) {
        // Ignore errors on cleanup
      }
    };
  }, [fetchActivities]);

  const value = {
    activities,
    loading,
    error,
    refreshActivities: fetchActivities,
  };

  return (
    <ActivityFeedContext.Provider value={value}>
      {children}
    </ActivityFeedContext.Provider>
  );
};
