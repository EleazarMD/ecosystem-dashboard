/**
 * useGooseMessaging Hook
 * Handles Goose agent message sending, tool execution, and page refresh
 * Shared across all three agents: workspace-ai, page-agent, dashboard-ai
 */

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { mcpServersToSources } from '@/lib/workspace/page-utils';
import { blockOperationsParser } from '@/services/goose/BlockOperationsParser';
import { blockOperations } from '@/services/goose/BlockOperations';

export interface ThinkingData {
  plan?: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  currentStep?: string;
  toolsUsed?: Array<{ name: string; args?: any }>;
  reasoning?: string;
  thoughts?: string[];
}

export interface GooseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: ThinkingData;
  isStreaming?: boolean;
  recipeId?: string;
  isError?: boolean; // Flag to indicate this is an error message
}

export interface GooseSession {
  id: string;
  agentId: string;
  createdAt: number;
}

export interface UseGooseMessagingOptions {
  agentId: string;
  sessionId?: string;
  model?: string;
  mode?: 'quick' | 'context' | 'research';
  agencyMode?: string;
  mcpServers?: {
    workspace?: boolean;
    notion?: boolean;
    github?: boolean;
    filesystem?: boolean;
    knowledgeGraph?: boolean;
    perplexity?: boolean;
    custom?: string[];
  };
  context?: any;
  onPageUpdate?: () => void;
  onStreamingChunk?: (chunk: string) => void; // New callback for streaming text

  // Basic Settings
  temperature?: number;
  searchScope?: string;
  contextSize?: number;
  responseStyle?: string;
  workingDirectory?: string;
  knowledgeSources?: any;
  activeRecipeId?: string | null;

  // Advanced Settings - Optional per agent
  advancedSettings?: {
    // Session Management
    maxTurns?: number;
    contextStrategy?: 'summarize' | 'prompt' | 'truncate';
    autoCompactThreshold?: number;
    sessionAutosave?: boolean;

    // Multi-Model
    enableLeadWorker?: boolean;
    leadModel?: string;
    leadTurns?: number;
    enablePlanning?: boolean;
    plannerModel?: string;

    // Tool Behavior
    enableRouter?: boolean;
    enableToolshim?: boolean;
    toolOutputPriority?: number;

    // Security & Monitoring
    securityPromptEnabled?: boolean;
    securityThreshold?: number;
    debugEnabled?: boolean;
    showCosts?: boolean;
  };
}

export interface UseGooseMessagingResult {
  messages: GooseMessage[];
  isProcessing: boolean;
  session: GooseSession | null;
  sendMessage: (message: string) => Promise<void>;
  sendMessageStreaming: (message: string) => Promise<void>;  // Real-time streaming
  clearMessages: () => void;
  // Planning state
  planSteps: any[];
  thoughts: any[];
  currentPlanStep: any | null;
  planProgress: number;
}

/**
 * Hook for handling Goose agent messaging
 * 
 * @param options - Configuration options for the Goose agent
 * @returns Messaging interface with send, processing state, and messages
 */
export function useGooseMessaging(options: UseGooseMessagingOptions): UseGooseMessagingResult {
  const {
    agentId,
    sessionId: providedSessionId,
    model = 'claude-4-sonnet',
    mode = 'quick',
    agencyMode = 'auto',
    mcpServers,
    context,
    onPageUpdate,
    onStreamingChunk, // Destructure the new prop
    temperature,
    searchScope,
    contextSize,
    responseStyle,
    workingDirectory,
    knowledgeSources,
    activeRecipeId,
    advancedSettings,
  } = options;

  // Persist messages in sessionStorage to survive page reloads
  const getStorageKey = () => `goose_messages_${agentId}_${context?.pageId || 'global'}`;

  const [messages, setMessages] = useState<GooseMessage[]>(() => {
    // Initialize from sessionStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(getStorageKey());
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[useGooseMessaging] 📥 Restored', parsed.length, 'messages from storage');
          return parsed;
        }
      } catch (e) {
        console.error('[useGooseMessaging] ❌ Failed to restore messages:', e);
      }
    }
    return [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState<GooseSession | null>(null);

  // Planning state
  const [planSteps, setPlanSteps] = useState<any[]>([]);
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [currentPlanStep, setCurrentPlanStep] = useState<any | null>(null);
  const [planProgress, setPlanProgress] = useState(0);
  const toast = useToast();

  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        sessionStorage.setItem(getStorageKey(), JSON.stringify(messages));
        // console.log('[useGooseMessaging] 💾 Saved', messages.length, 'messages to storage');
      } catch (e) {
        console.error('[useGooseMessaging] ❌ Failed to save messages:', e);
      }
    }
  }, [messages]);

  // Initialize session
  const initializeSession = useCallback(() => {
    if (!session) {
      const newSession: GooseSession = {
        id: providedSessionId || `${agentId}-${Date.now()}`,
        agentId,
        createdAt: Date.now(),
      };
      setSession(newSession);
      console.log(`[useGooseMessaging] ✅ Session initialized: ${newSession.id}`);
      return newSession;
    }
    return session;
  }, [session, agentId, providedSessionId]);

  const sendMessageStreaming = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) {
      return;
    }

    const currentSession = initializeSession();

    console.log('[useGooseMessaging] 📨🔄 Sending message (STREAMING):', {
      sessionId: currentSession.id,
      agentId,
      messagePreview: userMessage.substring(0, 50),
    });

    // Add user message to chat
    const userMsg: GooseMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Convert mcpServers to mcpSources array
      const mcpSources = mcpServersToSources(mcpServers);

      // Call unified Goose API endpoint with streaming
      // Add timeout to prevent indefinite hanging if backend is down
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let apiResponse: Response;
      try {
        apiResponse = await fetch('/api/goose/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            sessionId: currentSession.id,
            agent_id: agentId,
            model,
            mode,
            agencyMode,
            context,
            mcpSources,
            streaming: true,  // Enable streaming
            // Basic Settings
            temperature,
            searchScope,
            contextSize,
            responseStyle,
            workingDirectory,
            knowledgeSources,
            // Advanced Settings
            ...advancedSettings,
            active_recipe: activeRecipeId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out - Goose backend may not be running. Please check if the backend server is started.');
        }
        throw new Error(`Failed to connect to Goose backend: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      console.log('[useGooseMessaging] 📡 API response status:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('[useGooseMessaging] ❌ API error:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          body: errorText
        });
        throw new Error(`API error: ${apiResponse.status} - ${errorText}`);
      }

      // Read SSE stream
      const reader = apiResponse.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse = '';
      let currentStreamingBlockId: string | null = null;

      // Track thinking data for the accordion
      const thinkingData: ThinkingData = {
        plan: [],
        toolsUsed: [],
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            console.log('[useGooseMessaging] 📡 SSE Event:', data.type, data.block_type || data.step?.title || '');

            // Planning events
            if (data.type === 'plan_created') {
              console.log('[useGooseMessaging] 📋 Plan created with', data.step_count, 'steps');
              const plan = data.plan || [];
              setPlanSteps(plan);
              setPlanProgress(0);
              // Add to thinking data
              thinkingData.plan = plan;

            } else if (data.type === 'step_start') {
              console.log('[useGooseMessaging] ▶️ Step started:', data.step?.title);
              setCurrentPlanStep(data.step);
              setPlanSteps(prev => prev.map(s =>
                s.id === data.step?.id ? { ...s, status: 'in_progress' } : s
              ));

            } else if (data.type === 'step_complete') {
              console.log('[useGooseMessaging] ✅ Step complete:', data.step?.title);
              setCurrentPlanStep(null);
              setPlanSteps(prev => prev.map(s =>
                s.id === data.step?.id ? { ...s, status: 'completed', result: data.step?.result } : s
              ));
              // Update progress
              const completed = planSteps.filter(s => s.status === 'completed').length + 1;
              setPlanProgress(Math.round((completed / planSteps.length) * 100));

            } else if (data.type === 'thought') {
              console.log('[useGooseMessaging] 💭 Thought:', data.content);
              setThoughts(prev => [...prev, {
                content: data.content,
                step_id: data.step_id,
                timestamp: data.timestamp || Date.now()
              }]);

            } else if (data.type === 'tool_start') {
              // Track tool usage
              if (data.tool) {
                console.log('[useGooseMessaging] 🔧 Tool started:', data.tool);
                if (!thinkingData.toolsUsed!.some(t => t.name === data.tool)) {
                  thinkingData.toolsUsed!.push({ name: data.tool, args: data.args });
                }
              }

            } else if (data.type === 'step_update') {
              setPlanSteps(prev => prev.map(s =>
                s.id === data.step?.id ? { ...s, detail: data.detail } : s
              ));

              // Block streaming events  
            } else if (data.type === 'block_start') {
              console.log('[useGooseMessaging] 🆕 Starting block:', data.block_type);
              // Removed page refresh to prevent cycling

            } else if (data.type === 'text_chunk') {
              // Text streaming - backend handles DB updates with debouncing
              // Frontend just needs to refresh occasionally to show progress
              console.log('[useGooseMessaging] ✍️ Text chunk:', data.text?.substring(0, 20));

              // Call streaming callback if provided
              if (onStreamingChunk && data.text) {
                onStreamingChunk(data.text);
              }

            } else if (data.type === 'block_complete') {
              // Block finished - final refresh to show complete content
              console.log('[useGooseMessaging] ✅ Block complete:', data.block_type);
              // Removed page refresh to prevent cycling
              currentStreamingBlockId = null;

            } else if (data.type === 'tool_complete') {
              // Trigger page refresh after each block create/update
              const isBlockOperation = data.tool && (
                data.tool.includes('create_block') ||
                data.tool.includes('update_block') ||
                data.tool.includes('update_page') ||
                data.tool.includes('create_page') ||
                data.tool.includes('workspace__')
              );

              if (isBlockOperation && onPageUpdate) {
                console.log('[useGooseMessaging] ✨ Tool completed:', data.tool);
                // Removed immediate refresh - wait for complete event
              }
            } else if (data.type === 'content') {
              // Accumulate content chunks for final response
              if (data.content) {
                finalResponse += data.content;
              }
            } else if (data.type === 'complete') {
              // Use accumulated content or fallback to result.response
              if (!finalResponse && data.result?.response) {
                finalResponse = data.result.response;
              }
            }
          }
        }
      }

      // Add final assistant response with thinking data
      if (finalResponse) {
        const assistantMsg: GooseMessage = {
          role: 'assistant',
          content: finalResponse,
          thinking: (thinkingData.plan && thinkingData.plan.length > 0) ||
            (thinkingData.toolsUsed && thinkingData.toolsUsed.length > 0)
            ? thinkingData
            : undefined,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

    } catch (error) {
      console.error('[useGooseMessaging] ❌ Streaming error:', error);
      toast({
        title: 'Streaming Error',
        description: String(error),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [agentId, model, mode, agencyMode, context, mcpServers, temperature, searchScope, contextSize, responseStyle, workingDirectory, knowledgeSources, advancedSettings, isProcessing, initializeSession, onPageUpdate, toast]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) {
      return;
    }

    const currentSession = initializeSession();

    console.log('[useGooseMessaging] 📨 Sending message:', {
      sessionId: currentSession.id,
      agentId,
      model,
      agencyMode,
      messagePreview: userMessage.substring(0, 50),
    });

    // Add user message to chat
    const userMsg: GooseMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Add placeholder assistant message for streaming
    const assistantPlaceholder: GooseMessage = {
      role: 'assistant',
      content: '',
      isStreaming: true,
      thinking: {},
    };
    const placeholderIndex = messages.length + 1;
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      // ⚡️ Client-side Interception: Check for local operations (like rename page)
      // This allows us to handle commands that the server agent might not support yet
      if (context && (context as any).blocks) {
        const parsed = blockOperationsParser.parse(userMessage, (context as any).blocks);

        if (parsed.confidence > 0.9 && parsed.operations.length > 0) {
          console.log('[useGooseMessaging] ⚡️ Intercepting client-side operation:', parsed.description);

          // Execute operations locally
          // We need to handle 'update_page_title' specifically since it's not in the standard executeOperations
          let success = true;

          for (const op of parsed.operations) {
            if (op.type === 'update_page_title' as any) {
              success = blockOperations.updatePageTitle(context.pageId, op.content || '');
            } else {
              const result = blockOperations.executeOperation(op);
              success = success && result.success;
            }
          }

          if (success) {
            console.log('[useGooseMessaging] ✅ Client-side operation successful');

            // Mock a successful assistant response
            const mockResponse = `I've ${parsed.description.toLowerCase()}.`;

            // Update messages with the response
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages[placeholderIndex]) {
                newMessages[placeholderIndex] = {
                  role: 'assistant',
                  content: mockResponse,
                  isStreaming: false,
                  thinking: {
                    plan: [{
                      id: '1',
                      title: 'Execute Operation',
                      description: parsed.description,
                      status: 'completed'
                    }],
                    toolsUsed: [{ name: 'client_side_operation', args: { description: parsed.description } }]
                  }
                };
              }
              return newMessages;
            });

            setIsProcessing(false);

            // Trigger page update if callback provided
            if (onPageUpdate) {
              setTimeout(onPageUpdate, 100);
            }

            return; // Skip API call
          }
        }
      }

      // Convert mcpServers to mcpSources array
      const mcpSources = mcpServersToSources(mcpServers);

      console.log('[useGooseMessaging] 🔧 MCP Sources:', mcpSources);

      // Call unified Goose API endpoint with streaming enabled
      // Add timeout to prevent indefinite hanging if backend is down
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let apiResponse: Response;
      try {
        apiResponse = await fetch('/api/goose/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            sessionId: currentSession.id,
            agent_id: agentId,
            model,
            mode,
            agencyMode,
            context,
            mcpSources,
            streaming: true,
            temperature,
            searchScope,
            contextSize,
            responseStyle,
            workingDirectory,
            knowledgeSources,
            ...advancedSettings,
            active_recipe: activeRecipeId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timed out - Goose backend may not be running. Please check if the backend server is started.');
        }
        throw new Error(`Failed to connect to Goose backend: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${apiResponse.statusText}`);
      }

      // Handle streaming response
      const reader = apiResponse.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let thinkingData: ThinkingData = {
        plan: [],
        currentStep: '0',
        thoughts: [],
        toolsUsed: []
      };
      let currentStreamingBlockId: string | null = null;

      // Reset planning state
      setPlanSteps([]);
      setThoughts([]);
      setCurrentPlanStep('');
      setPlanProgress(0);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle different event types
              switch (data.type) {
                case 'planning_start':
                  console.log('[useGooseMessaging] 📋 Planning start');
                  thinkingData = { ...thinkingData, reasoning: 'Creating execution plan...' };
                  break;

                case 'plan_created':
                  console.log('[useGooseMessaging] 📝 Plan created:', data.plan);

                  // Enhance plan steps with context from the user message
                  const enhancedPlan = (data.plan || []).map((step: any, index: number) => {
                    let enhancedDescription = step.description || '';

                    // Add context based on step type and user message
                    if (index === 0 && userMessage) {
                      // First step: show what requirements we're understanding
                      enhancedDescription = `Analyzing request: "${userMessage.substring(0, 60)}${userMessage.length > 60 ? '...' : ''}"`;
                    }

                    return {
                      ...step,
                      description: enhancedDescription,
                      detail: '' // Will be populated by tool calls
                    };
                  });

                  thinkingData = { ...thinkingData, plan: enhancedPlan };
                  setPlanSteps(enhancedPlan);
                  break;

                case 'step_start':
                  console.log('[useGooseMessaging] ▶️ Step start:', data.step_id);
                  if (thinkingData.plan) {
                    thinkingData.plan = thinkingData.plan.map(s =>
                      s.id === data.step_id ? { ...s, status: 'in_progress' as const } : s
                    );
                    setPlanSteps(thinkingData.plan);
                  }
                  thinkingData.currentStep = String(data.step_id);
                  setCurrentPlanStep(data.step_id);
                  break;

                case 'step_complete':
                  console.log('[useGooseMessaging] ✅ Step complete:', data.step_id);
                  if (thinkingData.plan) {
                    thinkingData.plan = thinkingData.plan.map(s =>
                      s.id === data.step_id ? { ...s, status: 'completed' as const } : s
                    );
                    setPlanSteps(thinkingData.plan);
                  }
                  break;

                case 'step_update':
                  setPlanSteps(prev => prev.map(s =>
                    s.id === data.step?.id ? { ...s, detail: data.detail } : s
                  ));
                  break;

                case 'thought':
                  if (data.content) {
                    thinkingData.thoughts = [...(thinkingData.thoughts || []), data.content];
                    setThoughts(prev => [...prev, data.content]);
                    // Update reasoning to show the latest thought
                    thinkingData.reasoning = data.content;
                  }
                  break;

                case 'tool_call':
                  // Handle client-side tool execution
                  if (data.tool === 'update_page_title' && context?.pageId) {
                    console.log('[useGooseMessaging] 🛠️ Executing client-side tool:', data.tool, data.args);
                    const newTitle = data.args?.newTitle;
                    if (newTitle) {
                      const success = blockOperations.updatePageTitle(context.pageId, newTitle);
                      if (success) {
                        console.log('[useGooseMessaging] ✅ Page title updated to:', newTitle);
                        if (onPageUpdate) {
                          // Small delay to allow DB update
                          setTimeout(onPageUpdate, 100);
                        }
                      } else {
                        console.error('[useGooseMessaging] ❌ Failed to update page title');
                      }
                    }
                  }
                // Fall through to standard tool logging
                case 'tool_start':
                  if (data.tool) {
                    thinkingData.toolsUsed = thinkingData.toolsUsed || [];
                    if (!thinkingData.toolsUsed.some(t => t.name === data.tool)) {
                      thinkingData.toolsUsed.push({ name: data.tool, args: data.args });
                    }
                    console.log('[useGooseMessaging] 🔧 Tool call:', data.tool);

                    // Auto-progress steps since Goose API doesn't send step events
                    if (thinkingData.plan && thinkingData.plan.length > 0) {
                      const completedCount = thinkingData.plan.filter(s => s.status === 'completed').length;
                      const inProgressCount = thinkingData.plan.filter(s => s.status === 'in_progress').length;

                      // If no step is in progress, mark the first pending step as in_progress
                      if (inProgressCount === 0) {
                        const firstPending = thinkingData.plan.find(s => s.status === 'pending');
                        if (firstPending) {
                          thinkingData.plan = thinkingData.plan.map(s =>
                            s.id === firstPending.id ? { ...s, status: 'in_progress' as const } : s
                          );
                          setPlanSteps([...thinkingData.plan]);
                        }
                      }

                      // Add tool details to current in-progress step
                      const currentStep = thinkingData.plan.find(s => s.status === 'in_progress');
                      if (currentStep) {
                        const toolName = data.tool.replace('workspace__', '').replace(/_/g, ' ');
                        let toolDetail = `Using: ${toolName}`;

                        // Add specific details based on tool and args
                        if (data.tool.includes('create_table') || data.tool.includes('create_database')) {
                          const title = data.args?.properties?.title || data.args?.title;
                          if (title) {
                            toolDetail = `Creating table: "${title}"`;
                          }
                        } else if (data.tool.includes('read')) {
                          toolDetail = `Reading current workspace content`;
                        } else if (data.tool.includes('update')) {
                          toolDetail = `Updating workspace blocks`;
                        }

                        thinkingData.plan = thinkingData.plan.map(s =>
                          s.id === currentStep.id ? { ...s, detail: toolDetail } : s
                        );
                        setPlanSteps([...thinkingData.plan]);
                      }
                    }
                  }
                  break;

                case 'block_start':
                  console.log('[useGooseMessaging] 🆕 Starting block:', data.block_type);
                  break;

                case 'text_chunk':
                  console.log('[useGooseMessaging] ✍️ Text chunk:', data.text?.substring(0, 20));
                  if (onStreamingChunk && data.text) {
                    onStreamingChunk(data.text);
                  }
                  break;

                case 'block_complete':
                  console.log('[useGooseMessaging] ✅ Block complete:', data.block_type);
                  currentStreamingBlockId = null;
                  break;

                case 'tool_complete':
                  console.log('[useGooseMessaging] ✅ Tool completed:', data.tool);

                  // Auto-refresh page after block modifications to prevent loops
                  // Debounce to avoid excessive refreshes
                  if (data.tool && onPageUpdate) {
                    const isBlockModification = data.tool.includes('delete_block') ||
                      data.tool.includes('update_block') ||
                      data.tool.includes('update_page') ||  // Also refresh when page properties are updated
                      data.tool.includes('create_table') ||
                      data.tool.includes('create_database');

                    if (isBlockModification) {
                      // Clear any pending refresh
                      if ((window as any).__refreshTimeout) {
                        clearTimeout((window as any).__refreshTimeout);
                      }

                      // Debounce refresh by 100ms to batch rapid operations
                      (window as any).__refreshTimeout = setTimeout(() => {
                        console.log('[useGooseMessaging] 🔄 Auto-refreshing page after block modification');
                        onPageUpdate();
                      }, 100);
                    }
                  }

                  // Auto-complete current step and start next one
                  if (thinkingData.plan && thinkingData.plan.length > 0) {
                    const inProgressStep = thinkingData.plan.find(s => s.status === 'in_progress');
                    if (inProgressStep) {
                      // Track tool calls for this step (using any to avoid type issues)
                      const step = inProgressStep as any;
                      if (!step.toolCallCount) {
                        step.toolCallCount = 0;
                      }
                      step.toolCallCount++;

                      // Calculate minimum tools per step (distribute evenly)
                      // Relaxed to 1 to prevent getting stuck on simple steps
                      const minToolsPerStep = 1;

                      // Only complete step if we've done enough work
                      if (step.toolCallCount >= minToolsPerStep) {
                        // Mark current step as completed
                        thinkingData.plan = thinkingData.plan.map(s =>
                          s.id === inProgressStep.id ? { ...s, status: 'completed' as const } : s
                        );

                        // Start next pending step if any
                        const nextPending = thinkingData.plan.find(s => s.status === 'pending');
                        if (nextPending) {
                          thinkingData.plan = thinkingData.plan.map(s =>
                            s.id === nextPending.id ? { ...s, status: 'in_progress' as const, toolCallCount: 0 } : s
                          );
                        }

                        setPlanSteps([...thinkingData.plan]);
                      }
                    }
                  }
                  break;

                case 'content':
                  if (data.content) {
                    fullResponse += data.content;
                  }
                  break;

                case 'complete':
                  // Check both locations (direct or nested in result) for compatibility
                  const responseText = data.response || data.result?.response;

                  if (responseText && !fullResponse) {
                    fullResponse = responseText;
                  }
                  if (onPageUpdate) {
                    onPageUpdate(); // Refresh page structure at end
                  }

                  // Ensure all steps are marked as completed when session finishes
                  if (thinkingData.plan) {
                    thinkingData.plan = thinkingData.plan.map(s => ({ ...s, status: 'completed' as const }));
                    setPlanSteps(thinkingData.plan);
                  }
                  break;
              }

              // Update chat message with latest thinking/content
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages[placeholderIndex]) {
                  newMessages[placeholderIndex] = {
                    role: 'assistant',
                    content: fullResponse,
                    thinking: thinkingData,
                    isStreaming: true,
                    recipeId: data.result?.recipe_id || data.recipe_id,
                  };
                }
                return newMessages;
              });

            } catch (e) {
              console.error('[useGooseMessaging] Failed to parse SSE:', e);
            }
          }
        }
      }

      // Finalize message
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[placeholderIndex]) {
          newMessages[placeholderIndex] = {
            ...newMessages[placeholderIndex],
            isStreaming: false,
          };
        }
        return newMessages;
      });

    } catch (error) {
      console.error('[useGooseMessaging] ❌ Error:', error);

      toast({
        title: 'Message failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });

      const errorMsg: GooseMessage = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Failed to send message',
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, session, agentId, model, mode, agencyMode, mcpServers, context, onPageUpdate, toast, initializeSession, onStreamingChunk, temperature, searchScope, contextSize, responseStyle, workingDirectory, knowledgeSources, advancedSettings, activeRecipeId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSession(null);
    // Clear from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(getStorageKey());
        console.log('[useGooseMessaging] 🗑️ Cleared messages from storage');
      } catch (e) {
        console.error('[useGooseMessaging] ❌ Failed to clear messages:', e);
      }
    }
  }, []);

  return {
    messages,
    isProcessing,
    session,
    sendMessage,
    sendMessageStreaming,  // Real-time streaming support
    clearMessages,
    // Planning state
    planSteps,
    thoughts,
    currentPlanStep,
    planProgress,
  };
}
