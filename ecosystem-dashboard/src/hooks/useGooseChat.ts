/**
 * useGooseChat Hook
 * Custom hook for WorkspaceAI to use Goose backend
 * 
 * Features:
 * - Toggle between Goose and direct AI Gateway
 * - Tool usage tracking
 * - Session management
 * - Fallback handling
 */

import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolUsage {
  tool: string;
  input: any;
  output: any;
  duration?: number;
}

export interface ChatResponse {
  response: string;
  tools_used?: ToolUsage[];
  cost?: number;
  tokens?: {
    input: number;
    output: number;
  };
  model?: string;
  session_id?: string;
  fallback?: boolean;
  warning?: string;
}

export interface UseGooseChatOptions {
  useGoose?: boolean; // Toggle to use Goose vs direct Gateway
  model?: string;
  mode?: 'quick' | 'context' | 'research' | 'code';
  systemContext?: string;
  mcpSources?: string[];
  knowledgeSources?: any;
  onToolsUsed?: (tools: ToolUsage[]) => void;
}

export function useGooseChat(options: UseGooseChatOptions = {}) {
  const {
    useGoose = true,
    model = 'claude-sonnet-4-20250514',
    mode = 'quick',
    systemContext,
    mcpSources = [],
    knowledgeSources = {},
    onToolsUsed,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastToolsUsed, setLastToolsUsed] = useState<ToolUsage[]>([]);
  const toast = useToast();

  const sendMessage = useCallback(
    async (
      message: string,
      conversationHistory: ChatMessage[] = []
    ): Promise<ChatResponse> => {
      setIsLoading(true);

      try {
        const endpoint = useGoose ? '/api/goose/chat' : '/api/ai-gateway/chat';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            conversationHistory,
            model,
            mode,
            systemContext,
            mcpSources,
            knowledgeSources,
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.statusText}`);
        }

        const data: ChatResponse = await response.json();

        // Update session ID
        if (data.session_id) {
          setSessionId(data.session_id);
        }

        // Track tools used
        if (data.tools_used && data.tools_used.length > 0) {
          setLastToolsUsed(data.tools_used);
          onToolsUsed?.(data.tools_used);
        }

        // Show warning if fallback was used
        if (data.fallback && data.warning) {
          toast({
            title: 'Using Fallback',
            description: data.warning,
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }

        return data;
      } catch (error: any) {
        console.error('Chat error:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [
      useGoose,
      model,
      mode,
      systemContext,
      mcpSources,
      knowledgeSources,
      sessionId,
      onToolsUsed,
      toast,
    ]
  );

  const resetSession = useCallback(() => {
    setSessionId(null);
    setLastToolsUsed([]);
  }, []);

  return {
    sendMessage,
    isLoading,
    sessionId,
    lastToolsUsed,
    resetSession,
  };
}
