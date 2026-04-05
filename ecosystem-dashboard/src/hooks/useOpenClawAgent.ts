/**
 * Hook for managing user's OpenClaw agent
 * 
 * Handles agent provisioning and status checking for multi-tenant OpenClaw.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenantContext } from '@/hooks/useTenantContext';

export interface OpenClawAgentStatus {
  agentId: string | null;
  exists: boolean;
  workspacePath: string | null;
  sessionsPath: string | null;
  hasBootstrap: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useOpenClawAgent() {
  const { isAuthenticated, user } = useAuth();
  const { tenantId } = useTenantContext();
  
  const [status, setStatus] = useState<OpenClawAgentStatus>({
    agentId: null,
    exists: false,
    workspacePath: null,
    sessionsPath: null,
    hasBootstrap: false,
    isLoading: true,
    error: null,
  });

  const checkAgent = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers['X-Tenant-Id'] = tenantId;
      }

      const res = await fetch('/api/openclaw/provision-agent', { headers });
      
      if (res.ok) {
        const data = await res.json();
        setStatus({
          agentId: data.agentId,
          exists: data.exists,
          workspacePath: data.workspacePath,
          sessionsPath: data.sessionsPath,
          hasBootstrap: data.hasBootstrap,
          isLoading: false,
          error: null,
        });
      } else {
        const error = await res.json();
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error.error || 'Failed to check agent status',
        }));
      }
    } catch (err: any) {
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Network error',
      }));
    }
  }, [isAuthenticated, user, tenantId]);

  const provisionAgent = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tenantId) {
        headers['X-Tenant-Id'] = tenantId;
      }

      const res = await fetch('/api/openclaw/provision-agent', {
        method: 'POST',
        headers,
      });
      
      if (res.ok) {
        const data = await res.json();
        setStatus({
          agentId: data.agentId,
          exists: data.exists,
          workspacePath: data.workspacePath,
          sessionsPath: data.sessionsPath,
          hasBootstrap: data.hasBootstrap,
          isLoading: false,
          error: null,
        });
        return { success: true, agentId: data.agentId };
      } else {
        const error = await res.json();
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: error.error || 'Failed to provision agent',
        }));
        return { success: false, error: error.error };
      }
    } catch (err: any) {
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Network error',
      }));
      return { success: false, error: err.message };
    }
  }, [isAuthenticated, user, tenantId]);

  // Check agent status on mount and when user/tenant changes
  useEffect(() => {
    checkAgent();
  }, [checkAgent]);

  return {
    ...status,
    checkAgent,
    provisionAgent,
  };
}

export default useOpenClawAgent;
