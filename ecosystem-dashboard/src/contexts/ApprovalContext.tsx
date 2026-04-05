/**
 * Approval Context
 * 
 * Manages the state for the human-in-the-loop approval system.
 * Provides real-time updates via WebSocket and methods to approve/reject actions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  ApprovalRequest,
  ApprovalSummary,
  ApprovalStats,
  ApprovalSettings,
  ApprovalStatus,
  ApprovalWebSocketEvent,
} from '@/types/approval';

interface ApprovalContextValue {
  // State
  pendingApprovals: ApprovalSummary[];
  stats: ApprovalStats | null;
  settings: ApprovalSettings | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Actions
  fetchPendingApprovals: () => Promise<void>;
  getApprovalDetail: (id: string) => Promise<ApprovalRequest | null>;
  approveAction: (id: string) => Promise<boolean>;
  rejectAction: (id: string, reason?: string) => Promise<boolean>;
  batchApprove: (ids: string[]) => Promise<boolean>;
  batchReject: (ids: string[], reason?: string) => Promise<boolean>;
  updateSettings: (settings: Partial<ApprovalSettings>) => Promise<boolean>;
  refreshStats: () => Promise<void>;
  
  // Badge count for mobile nav
  pendingCount: number;
  criticalCount: number;
}

const ApprovalContext = createContext<ApprovalContextValue | null>(null);

export function useApproval() {
  const context = useContext(ApprovalContext);
  if (!context) {
    throw new Error('useApproval must be used within an ApprovalProvider');
  }
  return context;
}

// Safe version that doesn't throw
export function useApprovalSafe() {
  return useContext(ApprovalContext);
}

interface ApprovalProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function ApprovalProvider({ children, userId = 'default-user' }: ApprovalProviderProps) {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalSummary[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isApprovalUser, setIsApprovalUser] = useState<boolean | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // Computed values
  const pendingCount = pendingApprovals.filter(a => a.status === 'pending').length;
  const criticalCount = pendingApprovals.filter(
    a => a.status === 'pending' && (a.priority === 'critical' || a.risk_level === 'critical')
  ).length;
  
  // Check if user needs approval system (has child accounts)
  const checkApprovalNeeded = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        setIsApprovalUser(false);
        return;
      }
      
      const data = await response.json();
      // Only enable for family accounts or users with child accounts
      const needsApproval = data.subscriptionTier === 'family' || data.hasChildAccounts === true;
      setIsApprovalUser(needsApproval);
      
      if (!needsApproval) {
        console.log('[ApprovalContext] Approval system not needed for this user');
      }
    } catch (err) {
      console.error('[ApprovalContext] Error checking approval status:', err);
      setIsApprovalUser(false);
    }
  }, []);
  
  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async () => {
    // Skip if user doesn't need approvals
    if (isApprovalUser === false) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/approvals?status=pending&user_id=${userId}`);
      
      if (!response.ok) {
        // Silently fail if endpoint doesn't exist (404) or user doesn't have access (403)
        if (response.status === 404 || response.status === 403) {
          setIsApprovalUser(false);
          return;
        }
        throw new Error('Failed to fetch pending approvals');
      }
      
      const data = await response.json();
      setPendingApprovals(data.approvals || []);
      setError(null);
    } catch (err) {
      console.error('[ApprovalContext] Fetch error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isApprovalUser]);
  
  // Fetch approval detail
  const getApprovalDetail = useCallback(async (id: string): Promise<ApprovalRequest | null> => {
    try {
      const response = await fetch(`/api/approvals/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval detail');
      }
      
      const data = await response.json();
      return data.approval;
    } catch (err) {
      console.error('[ApprovalContext] Detail fetch error:', err);
      return null;
    }
  }, []);
  
  // Approve an action
  const approveAction = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve action');
      }
      
      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== id));
      
      return true;
    } catch (err) {
      console.error('[ApprovalContext] Approve error:', err);
      return false;
    }
  }, [userId]);
  
  // Reject an action
  const rejectAction = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject action');
      }
      
      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== id));
      
      return true;
    } catch (err) {
      console.error('[ApprovalContext] Reject error:', err);
      return false;
    }
  }, [userId]);
  
  // Batch approve
  const batchApprove = useCallback(async (ids: string[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/approvals/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'approve', user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch approve');
      }
      
      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => !ids.includes(a.id)));
      
      return true;
    } catch (err) {
      console.error('[ApprovalContext] Batch approve error:', err);
      return false;
    }
  }, [userId]);
  
  // Batch reject
  const batchReject = useCallback(async (ids: string[], reason?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/approvals/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'reject', reason, user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch reject');
      }
      
      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => !ids.includes(a.id)));
      
      return true;
    } catch (err) {
      console.error('[ApprovalContext] Batch reject error:', err);
      return false;
    }
  }, [userId]);
  
  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<ApprovalSettings>): Promise<boolean> => {
    try {
      const response = await fetch('/api/approvals/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSettings, user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      const data = await response.json();
      setSettings(data.settings);
      
      return true;
    } catch (err) {
      console.error('[ApprovalContext] Settings update error:', err);
      return false;
    }
  }, [userId]);
  
  // Refresh stats
  const refreshStats = useCallback(async () => {
    // Skip if user doesn't need approvals
    if (isApprovalUser === false) {
      return;
    }
    
    try {
      const response = await fetch(`/api/approvals/stats?user_id=${userId}`);
      
      if (!response.ok) {
        // Silently fail if endpoint doesn't exist
        if (response.status === 404 || response.status === 403) {
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('[ApprovalContext] Stats fetch error:', err);
    }
  }, [userId, isApprovalUser]);
  
  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/approvals/ws?user_id=${userId}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('[ApprovalContext] WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: ApprovalWebSocketEvent = JSON.parse(event.data);
          
          switch (message.type) {
            case 'new_approval':
              setPendingApprovals(prev => [
                {
                  id: message.data.id,
                  action_type: message.data.action_type,
                  status: message.data.status,
                  priority: message.data.priority,
                  title: message.data.title,
                  summary: message.data.summary,
                  agent_name: message.data.agent.name,
                  risk_level: message.data.risk.level,
                  created_at: message.data.created_at,
                  expires_at: message.data.expires_at,
                },
                ...prev,
              ]);
              
              // Trigger notification sound/vibration on mobile
              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
              break;
              
            case 'approval_updated':
              setPendingApprovals(prev => 
                prev.map(a => a.id === message.data.id 
                  ? { ...a, status: message.data.status }
                  : a
                )
              );
              break;
              
            case 'approval_expired':
              setPendingApprovals(prev => 
                prev.map(a => a.id === message.data.id 
                  ? { ...a, status: 'expired' as ApprovalStatus }
                  : a
                )
              );
              break;
              
            case 'stats_updated':
              setStats(message.data);
              break;
          }
        } catch (err) {
          console.error('[ApprovalContext] WebSocket message error:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('[ApprovalContext] WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt reconnection with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[ApprovalContext] Attempting WebSocket reconnection...');
          connectWebSocket();
        }, delay);
      };
      
      wsRef.current.onerror = (err) => {
        console.error('[ApprovalContext] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[ApprovalContext] WebSocket connection error:', err);
    }
  }, [userId]);
  
  // Initialize on mount - check if user needs approval system first
  useEffect(() => {
    checkApprovalNeeded();
  }, [checkApprovalNeeded]);
  
  // Initialize approval system only if needed
  useEffect(() => {
    if (isApprovalUser === null || isApprovalUser === false) {
      return;
    }
    
    fetchPendingApprovals();
    refreshStats();
    
    // Fetch settings
    fetch(`/api/approvals/settings?user_id=${userId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setSettings(data.settings))
      .catch(console.error);
    
    // Connect WebSocket (disabled for now until endpoint exists)
    // connectWebSocket();
    
    // Poll as fallback (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchPendingApprovals();
    }, 30000);
    
    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, isApprovalUser, fetchPendingApprovals, refreshStats]);
  
  const value: ApprovalContextValue = {
    pendingApprovals,
    stats,
    settings,
    isLoading,
    error,
    isConnected,
    fetchPendingApprovals,
    getApprovalDetail,
    approveAction,
    rejectAction,
    batchApprove,
    batchReject,
    updateSettings,
    refreshStats,
    pendingCount,
    criticalCount,
  };
  
  return (
    <ApprovalContext.Provider value={value}>
      {children}
    </ApprovalContext.Provider>
  );
}

export default ApprovalContext;
