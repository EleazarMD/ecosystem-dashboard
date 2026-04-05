import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
  model?: string;
  tools_used?: any[];
}

export interface ChatSession {
  session_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
  model: string;
  agent_mode: 'goose' | 'direct';
}

interface UseChatHistoryReturn {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  
  // Session management
  createSession: (title?: string) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  listSessions: () => Promise<void>;
  
  // Message management
  saveMessage: (message: ChatMessage) => Promise<void>;
  clearCurrentSession: () => void;
}

export function useChatHistory(
  agentId: string = 'workspace-ai',
  userId?: string
): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create new session
  const createSession = useCallback(async (title?: string): Promise<string> => {
    const sessionId = `workspace-${Date.now()}`;
    const newSession: ChatSession = {
      session_id: sessionId,
      title: title || 'New Chat',
      messages: [],
      created_at: new Date(),
      updated_at: new Date(),
      model: 'claude-sonnet-4-20250514',
      agent_mode: 'goose',
    };
    
    setCurrentSession(newSession);
    return sessionId;
  }, []);

  // Load session from database
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations?session_id=${sessionId}&agent_id=${agentId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load session');
      }
      
      // Transform database format to our format
      const messages: ChatMessage[] = data.conversations.map((conv: any) => ({
        id: conv.id,
        role: conv.role,
        content: conv.content,
        timestamp: new Date(conv.created_at),
        tokens: conv.tokens_used,
        model: conv.model_used,
        ...conv.metadata,
      }));
      
      const session: ChatSession = {
        session_id: sessionId,
        title: messages[0]?.content.substring(0, 50) || 'Untitled Chat',
        messages,
        created_at: messages[0] ? new Date(messages[0].timestamp) : new Date(),
        updated_at: messages[messages.length - 1] ? new Date(messages[messages.length - 1].timestamp) : new Date(),
        model: messages[0]?.model || 'claude-4-sonnet',
        agent_mode: 'goose',
      };
      
      setCurrentSession(session);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Save message to database
  const saveMessage = useCallback(async (message: ChatMessage) => {
    if (!currentSession) return;
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          user_id: userId || 'anonymous',
          session_id: currentSession.session_id,
          role: message.role,
          content: message.content,
          tokens_used: message.tokens,
          model_used: message.model,
          metadata: {
            cost: message.cost,
            tools_used: message.tools_used,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save message');
      }
      
      // Update current session
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { ...message, id: data.id }],
        updated_at: new Date(),
      } : null);
      
    } catch (err: any) {
      console.error('Failed to save message:', err);
      // Don't throw - allow UI to continue even if save fails
    }
  }, [currentSession, agentId, userId]);

  // List all sessions from Goose's local JSONL files
  const listSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/workspace/goose-sessions');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to list sessions');
      }
      
      // Transform Goose sessions to our format
      const transformedSessions: ChatSession[] = data.sessions.map((s: any) => ({
        session_id: s.session_id,
        title: s.title,
        messages: [], // Will load when session is opened
        created_at: new Date(s.created_at),
        updated_at: new Date(s.updated_at),
        model: 'claude-sonnet-4-20250514', // Default, will be in metadata
        agent_mode: 'goose' as const,
      }));
      
      setSessions(transformedSessions);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to list sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/conversations?session_id=${sessionId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete session');
      }
      
      // Update local state
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      if (currentSession?.session_id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to delete session:', err);
    }
  }, [currentSession]);

  // Clear current session (local only)
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
  }, []);

  return {
    sessions,
    currentSession,
    loading,
    error,
    createSession,
    loadSession,
    deleteSession,
    listSessions,
    saveMessage,
    clearCurrentSession,
  };
}
