/**
 * React Hook for Ollama AI Dashboard Agent Integration
 * 
 * Provides state management and API integration for the unified AI agent
 * connecting directly to Ollama via AI Gateway
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentQueryRequest, AgentQueryResponse } from '../pages/api/agent/query';
import { SystemOverviewResponse } from '../pages/api/agent/overview';

export interface AgentSession {
  sessionId: string;
  messages: AgentMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export interface AgentMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  data?: any;
  insights?: any[];
  recommendations?: string[];
  toolsUsed?: string[];
}

export interface UseGoogleADKAgentReturn {
  // State
  isLoading: boolean;
  error: string | null;
  currentSession: AgentSession | null;
  systemOverview: SystemOverviewResponse | null;
  
  // Actions
  sendMessage: (message: string, type?: 'query' | 'command' | 'insight' | 'analysis') => Promise<AgentQueryResponse>;
  getSystemOverview: () => Promise<SystemOverviewResponse>;
  generateInsights: () => Promise<AgentQueryResponse>;
  startNewSession: () => void;
  clearError: () => void;
  
  // Utilities
  getAgentStatus: () => Promise<{ initialized: boolean; activeSessions: number }>;
}

/**
 * React hook for managing communication with the AI Agent service
 * with robust error handling, timeouts, and fallbacks.
 */
export function useGoogleADKAgent(): UseGoogleADKAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<AgentSession | null>(null);
  const [systemOverview, setSystemOverview] = useState<SystemOverviewResponse | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message to the Google ADK agent
   */
  // Add configurable timeouts with default values
  const REQUEST_TIMEOUT_MS = 15000; // 15 second timeout for API requests
  const MAX_RETRIES = 1; // Maximum number of retries for failed requests
  
  const sendMessage = useCallback(async (
    message: string, 
    type: 'query' | 'command' | 'insight' | 'analysis' = 'query'
  ): Promise<AgentQueryResponse> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    setIsLoading(true);
    setError(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    // Create a timeout promise that rejects after the timeout period
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          reject(new Error('Request timed out after ' + REQUEST_TIMEOUT_MS + 'ms'));
        }
      }, REQUEST_TIMEOUT_MS);
    });

    try {
      console.log('🤖 Agent sendMessage - preparing request', { 
        type, 
        sessionId: currentSession?.sessionId,
        messageLength: message.trim().length
      });
      
      const requestBody: AgentQueryRequest = {
        message: message.trim(),
        type,
        sessionId: currentSession?.sessionId,
        context: {
          timeRange: '1h' // Default time range
        }
      };

      // Race the fetch against the timeout
      console.log('🚀 Sending agent query to API:', '/api/agent/query');
      const fetchPromise = fetch('/api/agent/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      // Wait for either the fetch to complete or the timeout to fire
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log('📡 Agent API response status:', response.status, response.statusText);
      if (!response.ok) {
        console.error('❌ Agent API error response:', response.status, response.statusText);
        throw new Error(`Agent request failed: ${response.status} ${response.statusText}`);
      }

      const agentResponse: AgentQueryResponse = await response.json();
      console.log('📦 Agent API response received:', { 
        success: agentResponse.success,
        responseLength: agentResponse.response?.length || 0,
        provider: agentResponse.provider,
        model: agentResponse.model,
        timestamp: agentResponse.timestamp,
        error: agentResponse.error
      });

      if (!agentResponse.success) {
        console.error('❌ Agent API returned error:', agentResponse.error);
        throw new Error(agentResponse.error || 'Agent request failed');
      }

      // Update session with new messages
      const userMessage: AgentMessage = {
        id: `msg_${Date.now()}_user`,
        type: 'user',
        content: message,
        timestamp: new Date()
      };

      // Handle successful response
      if (agentResponse.success) {
        console.log('✅ Creating agent message with response data');
        const newMessage: AgentMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'agent',
          content: agentResponse.response,
          timestamp: new Date(agentResponse.timestamp),
          data: {
            ...agentResponse.data,
            provider: agentResponse.provider,
            model: agentResponse.model,
            processingTime: agentResponse.processingTime
          },
          insights: agentResponse.insights,
          recommendations: agentResponse.recommendations,
          toolsUsed: agentResponse.toolsUsed
        };

        setCurrentSession(prev => {
          if (!prev) return null;
          const updatedSession = {
            ...prev,
            messages: [...prev.messages, userMessage, newMessage],
            lastActivity: new Date()
          };
          console.log('✅ Session updated with new messages', { 
            messageCount: updatedSession.messages.length,
            lastMessageType: 'agent',
            lastMessageTime: new Date().toISOString()
          });
          return updatedSession;
        });
      } else {
        // Add user message even if agent response failed
        setCurrentSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, userMessage],
            lastActivity: new Date()
          };
        });
      }

      return agentResponse;

    } catch (error) {
      console.error('🚨 Agent sendMessage error:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      } : String(error));
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Agent request was aborted');
        setError('Request timed out. Please try again.');
        
        // Create a fallback response for better UX
        return {
          success: false,
          response: "I'm sorry, but I couldn't process your request in time. This could be due to the Ollama service being unavailable or overloaded. Please try again later.",
          error: 'Request timed out',
          sessionId: currentSession?.sessionId || `session_${Date.now()}`,
          timestamp: new Date().toISOString(),
          toolsUsed: [],
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Agent request failed:', errorMessage);
      setError(errorMessage);
      
      // Return a fallback response rather than throwing
      return {
        success: false,
        response: "I'm sorry, but I encountered an error processing your request. This could be due to the Ollama AI service being unavailable. Please check that the service is running at http://localhost:11434.",
        error: errorMessage,
        sessionId: currentSession?.sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        toolsUsed: [],
      };
    } finally {
      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentSession?.sessionId]);

  /**
   * Get comprehensive system overview
   */
  const getSystemOverview = useCallback(async (): Promise<SystemOverviewResponse> => {
    setIsLoading(true);
    setError(null);
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          reject(new Error('Overview request timed out after ' + REQUEST_TIMEOUT_MS + 'ms'));
        }
      }, REQUEST_TIMEOUT_MS);
    });

    try {
      // Race the fetch against the timeout
      const fetchPromise = fetch('/api/agent/overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const overviewData: SystemOverviewResponse = await response.json();
      
      setSystemOverview(overviewData);
      
      if (!overviewData.success) {
        console.warn('System overview returned with warnings:', overviewData.error);
      }

      return overviewData;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get system overview';
      console.error('System overview error:', errorMessage);
      setError(errorMessage);
      
      // Return fallback response instead of throwing
      return {
        success: false,
        overview: {
          timestamp: new Date().toISOString(),
          services: {
            knowledgeGraph: { status: 'unknown' },
            ahis: { status: 'unknown' },
            aiGateway: { status: 'unknown' },
            kubernetes: { status: 'unknown' }
          },
          overallHealth: 'critical',
          activeServices: 0,
          totalServices: 4
        },
        error: errorMessage
      };
    } finally {
      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Generate proactive insights
   */
  const generateInsights = useCallback(async (): Promise<AgentQueryResponse> => {
    return sendMessage(
      `Generate proactive insights for the AI Homelab ecosystem. Analyze current system state, 
       identify optimization opportunities, and provide actionable recommendations across all services.`,
      'insight'
    );
  }, [sendMessage]);

  /**
   * Start a new agent session
   */
  const startNewSession = useCallback(() => {
    setCurrentSession(null);
    setError(null);
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get agent status with timeout protection
   */
  const getAgentStatus = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();

    try {
      // Set up timeout for the status request
      const timeoutPromise = new Promise<{initialized: boolean, activeSessions: number}>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          // Resolve with fallback data instead of rejecting
          return { initialized: false, activeSessions: 0 };
        }, 5000); // 5 second timeout for status check
      });

      const fetchPromise = fetch('/api/agent/status', {
        signal: controller.signal
      }).then(response => {
        if (response.ok) {
          return response.json();
        }
        return { initialized: false, activeSessions: 0 };
      });

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.info('Failed to get agent status:', error instanceof Error ? error.message : String(error));
      return { initialized: false, activeSessions: 0 };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, []);
  
  /**
   * Initialize agent and check status on component mount
   */
  useEffect(() => {
    let mounted = true;
    
    const initializeAgent = async () => {
      try {
        const status = await getAgentStatus();
        if (mounted && !status.initialized) {
          console.log('Agent not initialized, attempting to start new session');
          startNewSession();
        }
      } catch (error) {
        console.info('Agent initialization check failed:', error);
      }
    };
    
    initializeAgent();
    
    return () => {
      mounted = false;
    };
  }, [getAgentStatus, startNewSession]);

  return {
    // State
    isLoading,
    error,
    currentSession,
    systemOverview,
    
    // Actions
    sendMessage,
    getSystemOverview,
    generateInsights,
    startNewSession,
    clearError,
    
    // Utilities
    getAgentStatus
  };
}
