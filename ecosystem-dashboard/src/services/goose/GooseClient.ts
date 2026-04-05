/**
 * Goose Client Service
 * Handles communication with Goose AI Agent
 */

import { PageContext } from '@/lib/goose/blockSerializer';

export interface GooseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  recipeId?: string;
}

export interface GooseSession {
  id: string;
  pageId: string;
  context: {
    pageTitle: string;
    blockCount: number;
    workspaceId: string;
  };
  messages: GooseMessage[];
  createdAt: number;
}

export interface GooseConfig {
  provider: 'anthropic';
  model: string; // claude-sonnet-4
  mode: 'smart_approve' | 'auto' | 'approve' | 'chat';
  maxTurns: number;
  contextStrategy: 'truncate' | 'summarize' | 'clear';
}

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  context?: PageContext;
}

export interface SendMessageResponse {
  success: boolean;
  message?: GooseMessage;
  error?: string;
}

class GooseClientService {
  private baseUrl: string;
  private sessions: Map<string, GooseSession> = new Map();

  constructor(baseUrl: string = '/api/goose') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new Goose session for a page
   */
  async createSession(
    pageId: string,
    context: GooseSession['context']
  ): Promise<GooseSession> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, context }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const session: GooseSession = await response.json();
      this.sessions.set(session.id, session);
      return session;
    } catch (error) {
      console.error('[GooseClient] Error creating session:', error);
      throw error;
    }
  }

  /**
   * Send a message to Goose and get response
   */
  async sendMessage(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GooseClient] Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a message with streaming response
   */
  async sendMessageStream(
    request: SendMessageRequest,
    onChunk: (chunk: string) => void,
    onComplete: (fullMessage: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete(fullMessage);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullMessage += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('[GooseClient] Error streaming message:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<GooseSession | null> {
    try {
      // Check local cache first
      if (this.sessions.has(sessionId)) {
        return this.sessions.get(sessionId)!;
      }

      // Fetch from API
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);

      if (!response.ok) {
        return null;
      }

      const session: GooseSession = await response.json();
      this.sessions.set(session.id, session);
      return session;
    } catch (error) {
      console.error('[GooseClient] Error getting session:', error);
      return null;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        this.sessions.delete(sessionId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[GooseClient] Error deleting session:', error);
      return false;
    }
  }

  /**
   * Execute a quick action (rewrite, add bullets, etc.)
   */
  async executeQuickAction(
    sessionId: string,
    action: string,
    params?: any
  ): Promise<SendMessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, params }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute action: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GooseClient] Error executing action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const gooseClient = new GooseClientService();

export default GooseClientService;
