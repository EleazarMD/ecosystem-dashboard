import { useState, useRef, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface Agent {
  id: string;
  name: string;
  type: string;
  endpoint?: string;
  status: 'active' | 'inactive' | 'error';
  model?: string;
  source?: 'adk' | 'goose' | 'self' | 'mcp';
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  metadata?: {
    action?: string;
    duration?: number;
    status?: 'success' | 'error' | 'pending';
    protocol?: string;
    trace_id?: string;
    llm_model?: string;
    llm_provider?: string;
  };
}

export interface EventTrace {
  id: string;
  timestamp: Date;
  event_type: 'function_call' | 'response' | 'error' | 'trace';
  agent_id: string;
  function_name?: string;
  input?: any;
  output?: any;
  duration?: number;
  status: 'success' | 'error' | 'pending';
  trace_logs?: string[];
}

// Trust agents to provide conversational responses based on context instructions
const extractHumanReadableContent = (a2aData: any, userInput: string): string => {
  if (!a2aData) return 'No response received.';
  
  // Agents should provide clean conversational responses in data.response field
  // based on the conversational context we send them
  if (a2aData.success && a2aData.result?.data) {
    const data = a2aData.result.data;
    
    // Handle nested data structure (some agents return data.data.response)
    if (data.data && data.data.response) {
      return data.data.response;
    }
    
    // Trust the agent to put conversational content in the right field
    return data.response || data.analysis || data.content || data.message || data.output || data.query_result || 'Agent completed your request.';
  }
  
  // Handle direct responses
  if (a2aData.success && a2aData.result) {
    return typeof a2aData.result === 'string' ? a2aData.result : 'Task completed successfully.';
  }
  
  // Simple response structure
  if (a2aData.response) {
    return a2aData.response;
  }
  
  return a2aData.success ? 'Task completed successfully.' : 'Unable to process your request. Please try again.';
};

interface UseAgentMessagingProps {
  selectedAgent: Agent | null;
  currentMessage: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCurrentMessage: React.Dispatch<React.SetStateAction<string>>;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  addEvent: (event: Omit<EventTrace, 'id' | 'timestamp'>) => void;
}

export const useAgentMessaging = ({
  selectedAgent,
  currentMessage,
  messages,
  setMessages,
  setCurrentMessage,
  setIsTyping,
  addEvent,
}: UseAgentMessagingProps) => {
  const [agentConversations, setAgentConversations] = useState<Record<string, ChatMessage[]>>({});
  const [agentEvents, setAgentEvents] = useState<Record<string, EventTrace[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Get messages and events for the currently selected agent
  const currentMessages = selectedAgent ? (agentConversations[selectedAgent.id] || []) : [];
  const currentEvents = selectedAgent ? (agentEvents[selectedAgent.id] || []) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const clearConversation = () => {
    if (!selectedAgent) return;
    
    setMessages([]);

    toast({
      title: "Conversation cleared",
      description: `Cleared chat history with ${selectedAgent.name}`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedAgent) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
      agentId: selectedAgent.id,
    };

    addMessage(userMessage);
    const userInput = currentMessage.trim();
    setCurrentMessage('');
    setIsTyping(true);

    addEvent({
      event_type: 'function_call',
      agent_id: selectedAgent.id,
      function_name: 'chat_request',
      input: { message: userInput },
      status: 'pending',
    });

    try {
      // Get agent's configured model first
      let agentModel = 'mistral:latest'; // Default fallback
      try {
        const settingsResponse = await fetch(`/api/agent-settings?agentId=${selectedAgent.id}`);
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          agentModel = settingsData.settings?.model || 'mistral:latest';
        }
      } catch (settingsError) {
        console.warn('Could not fetch agent settings, using default model:', settingsError);
      }

      // Check if this is the dashboard agent - handle locally instead of A2A
      if (selectedAgent.id === 'dashboard_ai_coordinator' || selectedAgent.id === 'dashboard-ai-coordinator') {
        // Handle dashboard agent chat locally via AI Gateway
        // Include service identification for AI Inferencing Service integration
        const localResponse = await fetch('/api/ai-gateway/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-ID': 'agentic-control-dashboard',
            'X-Project-ID': 'agentic-control-ui'
          },
          body: JSON.stringify({
            message: userInput,
            model: agentModel, // Use agent's configured model
            context: {
              agentType: 'dashboard_coordinator',
              interface: 'conversational_ui',
              instruction: 'You are the Dashboard AI Coordinator for the AI Homelab ecosystem. Provide helpful, conversational responses about system status, agent capabilities, and operational insights.',
              serviceId: 'agentic-control-dashboard',
              projectId: 'agentic-control-ui'
            },
            stream: false
          })
        });

        if (localResponse.ok) {
          const localData = await localResponse.json();
          
          const agentResponse: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            type: 'agent',
            content: localData.response || 'I can help you with the AI Homelab ecosystem. What would you like to know?',
            timestamp: new Date(),
            agentId: selectedAgent.id,
            metadata: {
              action: 'local_chat',
              duration: 0,
              status: 'success',
              protocol: 'Local AI Gateway',
              llm_model: localData.model || agentModel,
              llm_provider: 'ollama'
            }
          };

          addMessage(agentResponse);
          
          addEvent({
            event_type: 'response',
            agent_id: selectedAgent.id,
            output: agentResponse.content,
            status: 'success'
          });

          setIsTyping(false);
          return;
        }
      }

      // For other agents, try A2A communication if endpoint is available
      console.log('🔍 Agent check:', {
        id: selectedAgent.id,
        isDashboardAgent: selectedAgent.id === 'dashboard_ai_coordinator' || selectedAgent.id === 'dashboard-ai-coordinator',
        hasEndpoint: !!selectedAgent.endpoint,
        source: selectedAgent.source
      });

      // Handle Goose agents differently
      if (selectedAgent.source === 'goose' && selectedAgent.endpoint) {
        console.log('🪿 Using Goose API endpoint');
        const endpoint = `${selectedAgent.endpoint}/api/chat`;
        const goosePayload = {
          message: currentMessage,
          session_id: `session-${Date.now()}`,
          mode: 'context',
          context: {
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('📤 Sending to Goose API:', goosePayload);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goosePayload)
        });

        if (response.ok) {
          const gooseData = await response.json();
          console.log('🪿 Goose API response:', gooseData);
          
          // Goose API returns: { response, tools_used, session_id, cost, tokens, model, timestamp }
          const responseContent = gooseData.response || 'Goose agent responded.';
          const llmModel = gooseData.model || 'unknown';
          const llmProvider = 'ai-gateway';
          const processingTime = 0; // Will be calculated when we add timing

          const agentResponse: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            type: 'agent',
            content: responseContent,
            timestamp: new Date(),
            agentId: selectedAgent.id,
            metadata: {
              action: 'goose_api_response',
              duration: processingTime,
              status: 'success',
              protocol: 'Goose API',
              llm_model: llmModel,
              llm_provider: llmProvider,
            },
          };

          addMessage(agentResponse);
          
          // Add successful response event
          addEvent({
            event_type: 'response',
            agent_id: selectedAgent.id,
            output: responseContent,
            duration: processingTime,
            status: 'success',
          });

          setIsTyping(false);
          return;
        }
      }
      // Use Dashboard orchestration for Dashboard AI agent or fallback
      else if (selectedAgent.id === 'dashboard_ai_coordinator' || selectedAgent.id === 'dashboard-ai-coordinator' || !selectedAgent.endpoint) {
        console.log('📡 Using Dashboard orchestration endpoint');
        const endpoint = '/api/orchestration/process';
        const orchestrationPayload = {
          message: currentMessage,
          context: {
            agentId: selectedAgent.id,
            agentType: selectedAgent.type,
            timestamp: new Date().toISOString()
          }
        };
        
        console.log('📤 Sending to orchestration:', orchestrationPayload);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orchestrationPayload)
        });

        if (response.ok) {
          const orchestrationData = await response.json();
          
          // Extract human-readable content from agent response
          let responseContent = extractHumanReadableContent(orchestrationData, userInput);
          let llmModel = '';
          let llmProvider = '';
          let processingTime = 0;
          
          // Extract metadata
          if (orchestrationData.result?.data) {
            llmModel = orchestrationData.result.data.model_used || orchestrationData.result.metadata?.model || '';
            llmProvider = orchestrationData.result.data.llm_provider || orchestrationData.result.metadata?.llm_provider || '';
            processingTime = orchestrationData.result.metadata?.processing_time_ms || 0;
          }

          const agentResponse: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            type: 'agent',
            content: responseContent,
            timestamp: new Date(),
            agentId: selectedAgent.id,
            metadata: {
              action: 'orchestration_response',
              duration: processingTime,
              status: 'success',
              protocol: 'Dashboard Orchestration',
              llm_model: llmModel,
              llm_provider: llmProvider,
            },
          };

          addMessage(agentResponse);
          
          // Add successful response event
          addEvent({
            event_type: 'response',
            agent_id: selectedAgent.id,
            output: responseContent,
            duration: processingTime,
            status: 'success',
          });

          setIsTyping(false);
          return;
        }
      }

      // For other agents, try A2A communication if endpoint is available
      if (selectedAgent.endpoint && selectedAgent.id !== 'dashboard_ai_coordinator' && selectedAgent.id !== 'dashboard-ai-coordinator') {
        const a2aResponse = await fetch(`${selectedAgent.endpoint}/a2a/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: selectedAgent.type === 'orchestrator' ? 'task_request' : 'query_request',
            payload: {
              query: userInput,
              context: {
                userId: 'dashboard-user',
                sessionId: `session-${Date.now()}`,
                agentType: selectedAgent.type,
                interface: 'conversational_ui',
                instruction: 'Respond directly and conversationally as if talking to a human user. Do not provide analysis, reasoning explanations, or technical details unless specifically requested. Just give the direct answer or response the user is looking for.'
              },
              response_format: 'conversational',
              output_style: 'direct_response'
            },
            requestId: `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
          }),
        });

        if (a2aResponse.ok) {
          const a2aData = await a2aResponse.json();
          
          // Extract human-readable content from agent response
          let responseContent = extractHumanReadableContent(a2aData, userInput);
          let llmModel = '';
          let llmProvider = '';
          let processingTime = 0;
          
          // Extract metadata
          if (a2aData.result?.data) {
            llmModel = a2aData.result.data.model_used || a2aData.result.metadata?.model || '';
            llmProvider = a2aData.result.data.llm_provider || a2aData.result.metadata?.llm_provider || '';
            processingTime = a2aData.result.metadata?.processing_time_ms || 0;
          }

          const agentResponse: ChatMessage = {
            id: `msg-${Date.now()}-agent`,
            type: 'agent',
            content: responseContent,
            timestamp: new Date(),
            agentId: selectedAgent.id,
            metadata: {
              action: 'a2a_response',
              duration: processingTime,
              status: 'success',
              protocol: 'A2A',
              trace_id: a2aData.trace_id || a2aData.requestId,
              llm_model: llmModel,
              llm_provider: llmProvider,
            },
          };

          addMessage(agentResponse);
          
          // Add successful response event
          addEvent({
            event_type: 'response',
            agent_id: selectedAgent.id,
            output: responseContent,
            duration: processingTime,
            status: 'success',
          });

          setIsTyping(false);
          return;
        }
      }

      // NO FALLBACKS - If agent fails, throw error
      throw new Error(`Agent ${selectedAgent.name} did not respond. Endpoint: ${selectedAgent.endpoint || 'NOT CONFIGURED'}`);
      
    } catch (error) {
      console.error('🚨 Agent communication FAILED:', error);
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Show ACTUAL error to user - NO MOCK RESPONSES
      const errorMessage = `❌ **Failed to communicate with ${selectedAgent.name}**

**Error:** ${errorMsg}

**Configuration:**
- Endpoint: ${selectedAgent.endpoint || '❌ NOT CONFIGURED'}
- Type: ${selectedAgent.type}
- Agent ID: ${selectedAgent.id}

**Troubleshooting:**
1. Verify agent is running: \`curl ${selectedAgent.endpoint || 'ENDPOINT_NOT_SET'}/health\`
2. Check agent logs
3. Verify network connectivity
4. Ensure port is accessible

**DO NOT show fake responses. This is a real error that needs to be fixed.**`;

      const errorResponse: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        type: 'agent',
        content: errorMessage,
        timestamp: new Date(),
        agentId: selectedAgent.id,
        metadata: {
          action: 'error',
          status: 'error',
          protocol: 'N/A',
        },
      };

      addMessage(errorResponse);
      
      addEvent({
        event_type: 'error',
        agent_id: selectedAgent.id,
        output: errorMsg,
        status: 'error',
      });

      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  return {
    currentMessages: messages,
    currentEvents,
    messagesEndRef,
    handleSendMessage,
    handleKeyPress,
    clearConversation,
  };
};
