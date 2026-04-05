/**
 * React Hook: Dashboard UI Assistant Agent Management
 * 
 * Provides React integration for Dashboard UI Assistant Agent registration
 * and status management with AHIS Server.
 */

import { useState, useEffect, useCallback } from 'react';
import { getDashboardAgent, DashboardAgentCapabilities, DashboardAgentMetadata } from '../lib/agent/DashboardUIAssistantAgent';

export interface AgentRegistrationStatus {
  isRegistered: boolean;
  agentId: string | null;
  registrationTime: string | null;
  capabilities: DashboardAgentCapabilities;
  metadata: DashboardAgentMetadata;
}

export interface AgentOperationResult {
  success: boolean;
  message: string;
  agentId?: string;
  timestamp: string;
  error?: string;
}

/**
 * Hook for managing Dashboard UI Assistant Agent registration
 */
export function useDashboardAgent() {
  const [status, setStatus] = useState<AgentRegistrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh agent status from the agent instance
   */
  const refreshStatus = useCallback(() => {
    try {
      const agent = getDashboardAgent();
      const currentStatus = agent.getRegistrationStatus();
      setStatus(currentStatus);
      setError(null);
    } catch (err) {
      console.error('Failed to get agent status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get agent status');
    }
  }, []);

  /**
   * Register the Dashboard UI Assistant Agent with AHIS Server
   */
  const registerAgent = useCallback(async (): Promise<AgentOperationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        refreshStatus();
        return {
          success: true,
          message: result.message,
          agentId: result.agentId,
          timestamp: result.timestamp
        };
      } else {
        setError(result.message || 'Registration failed');
        return {
          success: false,
          message: result.message || 'Registration failed',
          timestamp: result.timestamp,
          error: result.error
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration request failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Unregister the Dashboard UI Assistant Agent from AHIS Server
   */
  const unregisterAgent = useCallback(async (): Promise<AgentOperationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/unregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        refreshStatus();
        return {
          success: true,
          message: result.message,
          timestamp: result.timestamp
        };
      } else {
        setError(result.message || 'Unregistration failed');
        return {
          success: false,
          message: result.message || 'Unregistration failed',
          timestamp: result.timestamp,
          error: result.error
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unregistration request failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Initialize agent status on hook mount
   */
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    // Status
    status,
    isLoading,
    error,
    
    // Actions
    registerAgent,
    unregisterAgent,
    refreshStatus,
    
    // Computed properties
    isRegistered: status?.isRegistered || false,
    agentId: status?.agentId || null,
    capabilities: status?.capabilities || null,
    metadata: status?.metadata || null
  };
}
