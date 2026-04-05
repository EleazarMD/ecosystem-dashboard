/**
 * usePushNotifications Hook
 * 
 * React hook for managing push notification subscription and permissions.
 */

import { useState, useEffect, useCallback } from 'react';
import pushNotificationService from '@/services/PushNotificationService';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(userId: string = 'default-user'): UsePushNotificationsReturn {
  const [isSupported] = useState(() => pushNotificationService.isSupported());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check initial permission state
  useEffect(() => {
    if (isSupported) {
      setPermission(pushNotificationService.getPermission());
    } else {
      setPermission('unsupported');
    }
  }, [isSupported]);
  
  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pushNotificationService.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);
  
  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const subscription = await pushNotificationService.subscribe(userId);
      if (subscription) {
        setIsSubscribed(true);
        setPermission('granted');
        return true;
      }
      return false;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);
  
  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await pushNotificationService.unsubscribe(userId);
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}

export default usePushNotifications;
