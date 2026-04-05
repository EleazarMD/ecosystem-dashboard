/**
 * Usage Tracking Hook
 * 
 * Client-side hook for tracking child usage sessions
 */

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CHECK_INTERVAL = 60000; // 1 minute

export interface UsageData {
  todayMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  isOverLimit: boolean;
}

export function useUsageTracking() {
  const { data: session } = useSession();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  const checkInterval = useRef<NodeJS.Timeout>();

  // Start session on mount
  useEffect(() => {
    const user = session?.user as any;
    
    if (!user || user.accountType !== 'child') {
      return;
    }

    const startSession = async () => {
      try {
        const res = await fetch('/api/usage/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: router.pathname }),
        });

        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
        }
      } catch (error) {
        console.error('[UsageTracking] Error starting session:', error);
      }
    };

    startSession();

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [session, router.pathname]);

  // Send heartbeat
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/usage/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('[UsageTracking] Error sending heartbeat:', error);
      }
    };

    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [sessionId]);

  // Check time limit
  useEffect(() => {
    const user = session?.user as any;
    
    if (!user || user.accountType !== 'child') {
      return;
    }

    const checkLimit = async () => {
      try {
        const res = await fetch('/api/usage/check');
        
        if (res.ok) {
          const data = await res.json();
          setUsage(data.usage);

          // If over limit, redirect to time limit page
          if (!data.allowed && data.usage.isOverLimit) {
            router.push('/child/time-limit-reached');
          }
        }
      } catch (error) {
        console.error('[UsageTracking] Error checking limit:', error);
      }
    };

    // Check immediately
    checkLimit();

    // Check periodically
    checkInterval.current = setInterval(checkLimit, CHECK_INTERVAL);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [session, router]);

  return {
    usage,
    isTracking: !!sessionId,
  };
}
