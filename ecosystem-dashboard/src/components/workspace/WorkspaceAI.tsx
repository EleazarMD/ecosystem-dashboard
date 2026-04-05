/**
 * Workspace AI Component
 * General-purpose AI assistant for workspace with multiple modes:
 * - Quick Chat: Fast conversational AI
 * - Context Chat: AI with workspace context awareness
 * - Deep Research: Comprehensive research mode
 * - Code Assistance: Development helper
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useDeepResearchPolling } from '../../../hooks/useDeepResearchPolling';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  useToast,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  ButtonGroup,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiMessageSquare, FiDatabase, FiSearch, FiCode, FiFolder, FiZap, FiInfo, FiGlobe, FiFileText } from 'react-icons/fi';
import { ConversationSidebar } from './ConversationSidebar';
import AIInputInterface from '../research/AIInputInterface';
import { InlineClarificationPanel } from '../research/InlineClarificationPanel';
import { ResearchPlanSummary } from '../research/ResearchPlanSummary';
import {
  DeepResearchClarificationPanel,
  parseClarificationQuestions,
  hasClarificationQuestions
} from '../research/DeepResearchClarificationPanel';
import { DeepResearchPhaseIndicator } from '../research/DeepResearchPhaseIndicator';
import { ResearchParametersSummaryCard } from '../research/ResearchParametersSummaryCard';
import { useWorkspaceConversations } from '@/hooks/useWorkspaceConversations';
import { useAgentConfiguration } from '@/hooks/useAgentConfiguration';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { DualSearchResults } from './DualSearchResults';
// import type { Citation } from '../../../pages/api/workspace-ai/search-dual';
import type { PerplexityTool } from './PerplexityToolSelector';
import { PerplexityEnhancedInput, PerplexityMode } from '../common/PerplexityEnhancedInput';
import { DeepResearchPlanningDialog } from './DeepResearchPlanningDialog';
import { DEEP_RESEARCH_HINT } from '@/config/gooseHints';
import type {
  DeepResearchState,
  ResearchPlan,
  PerplexityDeepResearchParams
} from '@/types/perplexity';
import {
  parseGooseResearchPlan,
  researchPlanToParams
} from '@/types/perplexity';
import { MessageContentRenderer } from './MessageContentRenderer';
import ToolExecutionCard from './ToolExecutionCard';
import { GlassmorphicMessageCard } from './GlassmorphicMessageCard';
import ContentAreaLayout from '../layout/ContentAreaLayout';
import { PerplexicaModeSelector, AIMode } from './PerplexicaModeSelector';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Create motion components
const MotionBox = motion(Box);
const MotionImg = motion.img;
const MotionVStack = motion(VStack);

// Thinking dots animation component
const ThinkingDots: React.FC<{ dotColor: string }> = ({ dotColor }) => {
  return (
    <HStack spacing={1}>
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': {
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': {
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0s',
        }}
      />
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': {
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': {
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.2s',
        }}
      />
      <Box
        as="span"
        w="8px"
        h="8px"
        borderRadius="full"
        bg={dotColor}
        sx={{
          '@keyframes bounce': {
            '0%, 80%, 100%': {
              transform: 'translateY(0)',
              opacity: 0.7,
            },
            '40%': {
              transform: 'translateY(-8px)',
              opacity: 1,
            },
          },
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.4s',
        }}
      />
    </HStack>
  );
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  mode?: AIMode;
  context?: {
    workspaceId?: string;
    pageId?: string;
    includedContext?: string[];
  };
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
  tools_used?: Array<{
    name: string;
    arguments?: Record<string, any>;
    result?: string;
    error?: string;
    duration?: number;
    duration_ms?: number;
    timestamp?: string;
    status?: 'success' | 'error';
  }>;
  metadata?: {
    tools_used?: Array<{
      name: string;
      arguments: Record<string, any>;
      result?: string;
      error?: string;
      duration_ms?: number;
      timestamp?: string;
    }>;
    job_id?: string;
    job_status?: string;
  };
  fallback?: boolean;
  clarification?: {
    question: string;
    onSubmit: (responses: Record<string, any>) => void;
    onSkip: () => void;
  };
  researchPlan?: {
    originalQuestion: string;
    selectedScenario?: {
      title: string;
      scope: string;
      timeframe: string;
      depth: string;
      comparisons: string;
    };
    enhancedQuestion: string;
    researchStrategy: {
      keyAreas?: string[];
      searchTerms?: string[];
      sources?: string[];
    };
  };
  searchResults?: {
    citations: Citation[];
    metadata: {
      workspaceResultCount: number;
      webResultCount: number;
      totalSources: number;
      executionTimeMs: number;
    };
  };
  citations?: Array<{
    number: number;
    url: string;
    title?: string;
  }>;
}

interface WorkspaceContext {
  [key: string]: any;
}

export interface Citation {
  url: string;
  title: string;
  content: string;
  score?: number;
  source?: string;
}

interface WorkspaceAIProps {
  workspaceName?: string;
  userName?: string;
  onToggleSettings?: () => void;
  // WorkspaceAI settings from parent
  model?: string;
  temperature?: number;
  responseStyle?: 'concise' | 'balanced' | 'detailed';
  knowledgeSources?: {
    currentPage: boolean;
    workspace: boolean;
    databases: boolean;
    knowledgeGraph: boolean;
  };
  mcpServers?: {
    workspace: boolean;
    notion: boolean;
    github: boolean;
    filesystem: boolean;
    databases: boolean;
    knowledgeGraph: boolean;
    custom: string[];
  };
  enabledTools?: string[]; // Full list of enabled tools from database
  onMCPServersChange?: (servers: any) => void;
  searchScope?: 'current' | 'workspace' | 'all';
  contextSize?: number;

  // Agent mode (optional - controlled from parent or internal state)
  useGoose?: boolean;
  onUseGooseChange?: (useGoose: boolean) => void;

  // Filesystem access
  workingDirectory?: string;

  // Deep Research settings
  deepResearchMaxTokens?: number;
  deepResearchModel?: 'sonar-pro' | 'sonar-reasoning';
  deepResearchClarificationQuestions?: number;
  deepResearchSourceRecency?: 'day' | 'week' | 'month' | 'year' | 'any';
  deepResearchAutoPlanning?: boolean;

  // Layout
  leftSidebarWidth?: number;

  // Initial message from dashboard prompt bar (auto-sends on mount)
  initialMessage?: string;
}

export function WorkspaceAI({
  workspaceName = 'My Workspace',
  userName = 'User',
  onToggleSettings,
  model = 'xrt-llama-3.3-70b', // Default to local Llama 3.3
  temperature = 0.7,
  responseStyle = 'balanced',
  knowledgeSources = {
    currentPage: true,
    workspace: true,
    databases: false,
    knowledgeGraph: false,
  },
  mcpServers = {
    workspace: true,
    notion: false,
    github: false,
    filesystem: false,
    databases: false,
    knowledgeGraph: false,
    custom: [],
  },
  enabledTools = [], // Full list from database
  onMCPServersChange,
  searchScope = 'workspace',
  contextSize = 8192,
  useGoose: propUseGoose,
  onUseGooseChange,
  workingDirectory = '/Users/eleazar/Projects/AIHomelab',
  // Deep Research defaults
  deepResearchMaxTokens = 8000,
  deepResearchModel = 'sonar-pro',
  deepResearchClarificationQuestions = 3,
  deepResearchSourceRecency = 'any',
  deepResearchAutoPlanning = true,
  // Layout defaults
  leftSidebarWidth = 48,
  // Initial message (from dashboard prompt)
  initialMessage,
}: WorkspaceAIProps) {
  // Sidebar visibility state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

  // Next.js router for URL parameters
  const router = useRouter();

  // Load agent configuration with advanced settings from database
  const { config: agentConfig, loading: configLoading } = useAgentConfiguration('workspace-ai');

  // Right panel context for settings
  const { setCustomData } = useRightPanel();

  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Conversation management (database persistence)
  const {
    conversations,
    currentConversation,
    messages: dbMessages,
    projects,
    searchResults,
    isLoading: isLoadingConversations,
    createConversation,
    loadConversation,
    addMessage: saveMessageToDB,
    updateConversation,
    archiveConversation,
    searchConversations,
    generateTitle,
    exportConversation,
  } = useWorkspaceConversations();

  // Track if this is the initial empty state (for animations)
  const [isInitialState, setIsInitialState] = useState(true);
  const prevMessageLengthRef = useRef(0);

  // Goose toggle: use prop if provided, otherwise internal state with default false (Direct API)
  const [internalUseGoose, setInternalUseGoose] = useState(false);
  const useGoose = propUseGoose !== undefined ? propUseGoose : internalUseGoose;
  const setUseGoose = onUseGooseChange || setInternalUseGoose;

  // Track web search state for Perplexity MCP activation
  // Initialize from agent config if available
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Sync webSearchEnabled with agent config when it loads
  useEffect(() => {
    if (agentConfig?.mcpServers?.perplexity) {
      setWebSearchEnabled(true);
      console.log('[WorkspaceAI] 🔍 Initialized webSearchEnabled from config:', true);
    }
  }, [agentConfig]);

  // Track agency mode for Goose (autonomous, manual, smart, chat)
  const [agencyMode, setAgencyMode] = useState<'autonomous' | 'manual' | 'smart' | 'chat'>('autonomous');

  // Build active MCP servers including web search state
  // Use enabledTools if available (includes all tools), otherwise fall back to mcpServers
  // Memoized to prevent unnecessary re-renders
  const activeMcpServers = useMemo(() => enabledTools.length > 0
    ? {
      // Convert enabledTools array to object for backward compatibility
      workspace: enabledTools.includes('workspace'),
      notion: enabledTools.includes('notion'),
      github: enabledTools.includes('github'),
      filesystem: enabledTools.includes('filesystem'),
      knowledgeGraph: enabledTools.includes('knowledgeGraph'),
      developer: enabledTools.includes('developer'),
      screen: enabledTools.includes('screen'),
      memory: enabledTools.includes('memory'),
    }
    : mcpServers, [enabledTools, mcpServers]);

  // Handler for Goose AI mode toggle (called from input button click)
  const handleUseGooseChange = useCallback((enabled: boolean) => {
    setUseGoose(enabled);
    console.log('[WorkspaceAI] 🦆 Goose mode toggled:', enabled ? 'ON' : 'OFF');
  }, [setUseGoose]);

  // Handler for agency mode change (called from long-press menu)
  const handleAgencyModeChange = useCallback(async (mode: 'autonomous' | 'manual' | 'smart' | 'chat') => {
    setAgencyMode(mode);
    console.log('[WorkspaceAI] ⚙️ Agency mode changed:', mode);

    // Save to database
    try {
      const response = await fetch('/api/goose/settings/workspace-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyMode: mode }),
      });

      if (!response.ok) {
        console.error('[WorkspaceAI] Failed to save agencyMode:', await response.text());
      } else {
        console.log('[WorkspaceAI] ✅ Saved agencyMode to database:', mode);
      }
    } catch (error) {
      console.error('[WorkspaceAI] Error saving agencyMode:', error);
    }
  }, []);

  // Memoized settings callbacks
  const handleModelChange = useCallback((newModel: string) => {
    console.log('[WorkspaceAI] Model changed:', newModel);
    // TODO: Implement model change handler
  }, []);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    console.log('[WorkspaceAI] Temperature changed:', newTemp);
    // TODO: Implement temperature change handler
  }, []);

  const handleKnowledgeSourcesChange = useCallback((sources: any) => {
    console.log('[WorkspaceAI] Knowledge sources changed:', sources);
    // TODO: Implement knowledge sources change handler
  }, []);

  // Provide settings data to right panel
  // Track previous values to prevent unnecessary updates
  const prevValuesRef = useRef<string>('');

  useEffect(() => {
    // Stringify key values to detect real changes
    const currentValues = JSON.stringify({
      model,
      temperature,
      responseStyle,
      useGoose,
      agencyMode,
      mcpLoading: configLoading,
      contextSize,
      workingDirectory,
      deepResearchMaxTokens,
      deepResearchModel,
      deepResearchClarificationQuestions,
      deepResearchSourceRecency,
      deepResearchAutoPlanning,
    });

    // Only update if values actually changed
    if (currentValues !== prevValuesRef.current) {
      console.log('[WorkspaceAI] 🔄 Updating customData - useGoose:', useGoose);
      prevValuesRef.current = currentValues;

      setCustomData({
        model,
        temperature,
        responseStyle,
        useGoose,
        agencyMode,
        mcpServers: activeMcpServers,
        mcpLoading: configLoading,
        knowledgeSources,
        contextSize,
        workingDirectory,
        deepResearchMaxTokens,
        deepResearchModel,
        deepResearchClarificationQuestions,
        deepResearchSourceRecency,
        deepResearchAutoPlanning,
        onModelChange: handleModelChange,
        onTemperatureChange: handleTemperatureChange,
        onUseGooseChange: handleUseGooseChange,
        onAgencyModeChange: handleAgencyModeChange,
        onMCPServersChange,
        onKnowledgeSourcesChange: handleKnowledgeSourcesChange,
      });
    }
  }, [
    model,
    temperature,
    responseStyle,
    useGoose,
    agencyMode,
    activeMcpServers,
    configLoading,
    knowledgeSources,
    contextSize,
    workingDirectory,
    deepResearchMaxTokens,
    deepResearchModel,
    deepResearchClarificationQuestions,
    deepResearchSourceRecency,
    deepResearchAutoPlanning,
    setCustomData,
    handleModelChange,
    handleTemperatureChange,
    handleUseGooseChange,
    handleAgencyModeChange,
    handleKnowledgeSourcesChange,
    onMCPServersChange,
  ]);

  // Handler for immediate web search toggle (called from input button click)
  const handleWebSearchChange = useCallback(async (enabled: boolean) => {
    setWebSearchEnabled(enabled);

    // Persist Perplexity tool to Goose agent configuration
    if (useGoose) {
      console.log(`[WorkspaceAI] 🌐 Web search ${enabled ? 'enabled' : 'disabled'} - ${enabled ? 'Activating' : 'Deactivating'} Perplexity tool`);

      try {
        const currentConfig = agentConfig || {} as any;
        const currentTools: string[] = (currentConfig as any).enabledTools || [];

        const newTools = enabled
          ? currentTools.includes('perplexity')
            ? currentTools
            : [...currentTools, 'perplexity']
          : currentTools.filter(tool => tool !== 'perplexity');

        await fetch('/api/goose/settings/workspace-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentConfig,
            enabledTools: newTools
          }),
        });

        console.log(`[WorkspaceAI] ✅ Persisted Perplexity tool to database:`, enabled);
      } catch (error) {
        console.error('[WorkspaceAI] Failed to persist Perplexity tool:', error);
      }
    }
  }, [useGoose, agentConfig]);


  // Load agencyMode from database on mount
  useEffect(() => {
    const loadAgencyMode = async () => {
      try {
        const response = await fetch('/api/goose/settings/workspace-ai');
        if (response.ok) {
          const data = await response.json();
          if (data.agencyMode) {
            setAgencyMode(data.agencyMode);
            console.log('[WorkspaceAI] 📥 Loaded agencyMode from database:', data.agencyMode);
          }
        }
      } catch (error) {
        console.error('[WorkspaceAI] Error loading agencyMode:', error);
      }
    };

    loadAgencyMode();
  }, []);

  // Debug: Log useGoose state
  useEffect(() => {
    console.log('🤖 WorkspaceAI useGoose:', useGoose, '(prop:', propUseGoose, ')');
  }, [useGoose, propUseGoose]);

  // Auto-scroll to latest message when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages.length]); // Only trigger on message count change

  // Update initial state based on messages
  useEffect(() => {
    const currentLength = messages.length;
    const prevLength = prevMessageLengthRef.current;

    // Only update if length actually changed
    if (currentLength !== prevLength) {
      if (currentLength > 0 && isInitialState) {
        setIsInitialState(false);
      } else if (currentLength === 0 && !isInitialState) {
        setIsInitialState(true);
      }
      prevMessageLengthRef.current = currentLength;
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track conversation sync and save state to prevent infinite loops
  const lastSyncedConversationRef = useRef<string | null>(null);
  const lastSyncedMessageCountRef = useRef<number>(0);
  const savedMessageCountRef = useRef<number>(0);

  // Conversation management handlers - defined early so they can be used in useEffects
  const handleNewConversation = useCallback(async () => {
    const newConv = await createConversation({
      title: 'New Conversation',
      config: {
        model,
        mode: useGoose ? 'goose' : 'direct',
        agency_level: agencyMode as any, // Type mismatch between UI and API - needs alignment
        web_search_enabled: webSearchEnabled,
        mcp_servers_enabled: Object.keys(activeMcpServers).filter(k => activeMcpServers[k]),
      },
    });

    if (newConv) {
      // Clear current messages to start fresh
      setMessages([]);
      setSessionId(null);
      savedMessageCountRef.current = 0; // Reset saved message count
      lastSyncedConversationRef.current = null; // Reset sync tracking

      console.log('[WorkspaceAI] 🆕 Started new conversation:', newConv.id);

      // Navigate to new conversation URL to prevent auto-loading old conversation
      router.push(`/workspace-ai?conversation=${newConv.id}`);
    }
  }, [createConversation, model, useGoose, agencyMode, webSearchEnabled, activeMcpServers, router]);

  const handleSelectConversation = React.useCallback(async (id: string) => {
    console.log('[WorkspaceAI] 🔄 Selecting conversation:', id);
    await loadConversation(id);
    // Messages will be synced via useEffect below
  }, [loadConversation]);

  // Sync dbMessages to UI messages when conversation changes (NOT on every dbMessages update)
  useEffect(() => {
    if (!currentConversation) {
      lastSyncedConversationRef.current = null;
      lastSyncedMessageCountRef.current = 0;
      return;
    }

    // Only sync if conversation changed or initial load
    const conversationChanged = lastSyncedConversationRef.current !== currentConversation.id;
    const isInitialLoad = messages.length === 0 && dbMessages.length > 0;

    if (conversationChanged || isInitialLoad) {
      if (dbMessages.length > 0) {
        const uiMessages = dbMessages
          .filter(msg => msg.role !== 'system') // Filter out system messages
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            model: msg.metadata?.model_used || undefined,
            cost: msg.metadata?.cost || undefined,
          }));

        setMessages(uiMessages);
        lastSyncedConversationRef.current = currentConversation.id;
        lastSyncedMessageCountRef.current = dbMessages.length;
        console.log('[WorkspaceAI] 📂 Synced messages to UI:', currentConversation.id, 'with', uiMessages.length, 'messages');
      } else {
        setMessages([]);
        lastSyncedConversationRef.current = currentConversation.id;
        lastSyncedMessageCountRef.current = 0;
        console.log('[WorkspaceAI] 📭 No messages for conversation:', currentConversation.id);
      }
    }
  }, [currentConversation, dbMessages, messages.length]);

  // Track redirected conversation IDs to prevent infinite loops
  const redirectedConversations = useRef<Set<string>>(new Set());

  // Load conversation from URL parameter if present
  useEffect(() => {
    const conversationId = router.query.conversation as string;

    console.log('[WorkspaceAI] 🔗 URL Check:', {
      conversationId,
      isLoadingConversations,
      conversationsCount: conversations.length,
      currentConversationId: currentConversation?.id,
    });

    // Wait for conversations to finish loading from database
    if (isLoadingConversations) {
      console.log('[WorkspaceAI] ⏳ Still loading conversations, waiting...');
      return;
    }

    if (conversationId && conversations.length > 0) {
      const conversationExists = conversations.some(c => c.id === conversationId);

      console.log('[WorkspaceAI] 🔍 Conversation exists check:', {
        conversationId,
        exists: conversationExists,
        needsLoading: !currentConversation || currentConversation.id !== conversationId,
      });

      if (conversationExists && (!currentConversation || currentConversation.id !== conversationId)) {
        console.log('[WorkspaceAI] 🔗 Loading conversation from URL:', conversationId);
        handleSelectConversation(conversationId);
      } else if (!conversationExists && !redirectedConversations.current.has(conversationId)) {
        console.warn('[WorkspaceAI] ⚠️ Conversation not found in loaded conversations:', conversationId);
        console.log('[WorkspaceAI] 🔄 Redirecting to create new conversation');
        // Track this conversation ID to prevent redirect loop
        redirectedConversations.current.add(conversationId);
        // Remove invalid conversation ID from URL and create new conversation
        router.push('/workspace-ai', undefined, { shallow: true });
      }
    }
  }, [router, router.query.conversation, conversations, currentConversation, isLoadingConversations, handleSelectConversation]);

  // Auto-create conversation on mount if none exists (only when no URL param)
  // Use ref to track if initialization has already happened to prevent duplicates
  const hasInitialized = useRef(false);

  useEffect(() => {
    // CRITICAL: Wait for router to be ready before checking query params
    if (!router.isReady) return;

    const conversationId = router.query.conversation as string;

    // Skip initialization if URL has conversation parameter
    if (conversationId) {
      console.log('[WorkspaceAI] 🔗 URL has conversation ID, skipping auto-create');
      return;
    }

    // Skip if already initialized
    if (hasInitialized.current) return;

    // Skip if conversations are still loading from database
    if (isLoadingConversations) return;

    const initializeConversation = async () => {
      try {
        // Always create a new blank conversation when visiting without conversation ID
        if (!currentConversation) {
          console.log('[WorkspaceAI] Creating new blank conversation');
          await handleNewConversation();
          hasInitialized.current = true;
        }
      } catch (error) {
        console.warn('[WorkspaceAI] Failed to initialize conversation (backend may not be available):', error);
        // Continue without conversation - UI will still work
      }
    };

    initializeConversation();
  }, [router.isReady, router.query.conversation, conversations.length, currentConversation, isLoadingConversations, handleNewConversation, handleSelectConversation]); // Use conversations.length instead of conversations array

  // Auto-save NEW messages to database (only when messages are added, not when loading)
  useEffect(() => {
    const saveNewMessages = async () => {
      if (messages.length === 0 || !currentConversation) {
        savedMessageCountRef.current = 0;
        return;
      }

      // Validate conversation exists in the database before saving messages
      const conversationExists = conversations.some(conv => conv.id === currentConversation.id);
      if (!conversationExists) {
        console.warn('[WorkspaceAI] ⚠️ Skipping message save - conversation not found in database:', currentConversation.id);
        // Don't save messages for non-existent conversations
        return;
      }

      // Only save if we have NEW messages (more than what we've already saved)
      if (messages.length <= savedMessageCountRef.current) {
        return; // No new messages to save
      }

      // Save only the NEW messages (from savedMessageCountRef to end)
      const newMessages = messages.slice(savedMessageCountRef.current);

      for (const message of newMessages) {
        // Check if message came from database (has timestamp from DB)
        const isFromDatabase = dbMessages.some(dbMsg =>
          dbMsg.role === message.role &&
          dbMsg.content === message.content &&
          Math.abs(new Date(dbMsg.created_at).getTime() - message.timestamp.getTime()) < 1000
        );

        if (!isFromDatabase) {
          try {
            // This is a new message, save it
            await saveMessageToDB({
              role: message.role as 'user' | 'assistant' | 'system',
              content: message.content,
              metadata: {
                model_used: message.model || null,
                cost: message.cost || 0,
                tokens: {
                  input: (message as any).tokens?.input || 0,
                  output: (message as any).tokens?.output || 0,
                },
                sources: (message as any).sources || [],
                tool_calls: ((message as any).tools_used || []).map((tool: any) => ({
                  tool: tool.name || 'unknown',
                  timestamp: new Date().toISOString(),
                  result: tool.status || 'success',
                })),
                execution_time_ms: 0,
              },
            });

            console.log(`[WorkspaceAI] 💾 Auto-saved NEW ${message.role} message`);
          } catch (error) {
            console.error('[WorkspaceAI] ❌ Failed to save message:', error);
            // Don't throw - allow UI to continue working even if save fails
            return;
          }
        }
      }

      // Update saved count
      savedMessageCountRef.current = messages.length;
    };

    saveNewMessages();
  }, [messages.length, currentConversation, saveMessageToDB, dbMessages, conversations]);

  // AI Mode state
  const [aiMode, setAIMode] = useState<AIMode>('quick');
  const [currentMode, setCurrentMode] = useState<'deep' | 'conversational'>('conversational');

  // Search mode state for dual-search
  const [searchMode, setSearchMode] = useState<'dual' | 'workspace-only' | 'web-only'>('dual');

  // Context state
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext>({});
  const [useWorkspaceContext, setUseWorkspaceContext] = useState(false);

  // Research-specific state
  const [pollingSessionId, setPollingSessionId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [deepResearchMessageId, setDeepResearchMessageId] = useState<string | null>(null);
  const [agentSearchJobId, setAgentSearchJobId] = useState<string | null>(null);

  // Perplexity tool selection state
  const [selectedPerplexityTool, setSelectedPerplexityTool] = useState<PerplexityTool>(null);
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);

  // Perplexity mode detection state (from PerplexityEnhancedInput component)
  const [detectedPerplexityMode, setDetectedPerplexityMode] = useState<PerplexityMode>(null);

  // Deep Research Planning state (Goose meta-planning workflow)
  const [deepResearchState, setDeepResearchState] = useState<DeepResearchState>({
    phase: 'idle',
    isActive: false,
    originalQuery: '',
  });
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [deepResearchParams, setDeepResearchParams] = useState<PerplexityDeepResearchParams | null>(null);

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Deep Research: Detect Goose's research plan in messages (must be after state declarations)
  useEffect(() => {
    if (deepResearchState.phase === 'clarification' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Check if last message is from assistant and contains research plan
      if (lastMessage.role === 'assistant') {
        handleGooseResearchPlan(lastMessage.content);
      }
    }
  }, [messages, deepResearchState.phase]);

  const toast = useToast();
  // Use semantic theme tokens for proper theme support
  const bgColor = 'bgPrimary';
  const textColor = 'textPrimary';
  const mutedColor = 'textSecondary';
  const borderColor = 'borderDefault';
  const hoverBg = 'bgHover';

  // Markdown styling colors - use semantic tokens
  const codeInlineBg = 'bgSecondary';
  const codeBlockBg = 'bgTertiary';
  const blockquoteBorder = 'borderSubtle';

  // Empty state colors - now using theme tokens
  const emptyStateBg = useSemanticToken('surface.base');
  const brandingTitleColor = 'textPrimary';
  const brandingDescColor = 'textSecondary';
  const capabilityBlueColor = 'brand.500';
  const capabilityPurpleColor = 'accent.500';
  const capabilityGreenColor = 'brand.500';
  const capabilityOrangeColor = 'accent.500';
  const capabilityTealColor = 'brand.500';
  const toolsBannerBorder = 'brand.400';
  const toolsBannerText = 'brand.600';
  const toolSuccessColor = 'green.500';
  const toolErrorColor = 'red.500';

  // Message styling with semantic tokens
  const userMessageBg = 'glass.bg';
  const assistantMessageBg = 'glass.bgAlt';
  const toolsBorderColor = 'borderSubtle';
  const costBorderColor = 'borderDefault';
  const costBgColor = 'bgSecondary';
  const costSummaryTextColor = 'textTertiary';
  const loadingMessageBg = 'glass.bgAlt';
  const dotColor = 'textSecondary';

  // Deep Research Polling Hook
  useDeepResearchPolling(deepResearchMessageId, {
    interval: 5000, // Poll every 5 seconds
    onComplete: async (status) => {
      console.log('[WorkspaceAI] 🎉 Deep research completed:', status);

      // Reload messages to show the completed result
      if (currentConversation?.id) {
        await loadConversation(currentConversation.id);
      }

      // Clear the polling message ID
      setDeepResearchMessageId(null);
    },
    onError: (status) => {
      console.error('[WorkspaceAI] ❌ Deep research failed:', status);
      setDeepResearchMessageId(null);
    },
    onUpdate: (status) => {
      console.log(`[WorkspaceAI] 🔄 Deep research progress: ${status.job_progress}%`, status.job_current_step);
    },
  });

  // Agent Search Polling
  useEffect(() => {
    if (!agentSearchJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/perplexica/agent-status?id=${agentSearchJobId}`);
        const data = await response.json();

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            if (data.status === 'completed') {
              lastMessage.content = data.answer;
              lastMessage.citations = data.sources?.map((s: any, i: number) => ({
                number: i + 1,
                url: s.url,
                title: s.title
              }));
              setAgentSearchJobId(null);
              setIsLoading(false);
            } else {
              lastMessage.content = `🤖 **Goose Agent Active**\n\n${data.progress}\n\n*Orchestrating parallel subagents on RTX Workstation...*`;
            }
          }
          return newMessages;
        });

        if (data.status === 'completed') {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Agent polling error:', error);
        setAgentSearchJobId(null);
        setIsLoading(false);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [agentSearchJobId]);

  // Additional markdown styling with semantic tokens
  const blockquoteBg = 'bgSecondary';
  const strongColor = 'textPrimary';
  const emColor = 'textSecondary';
  const detailsBg = 'bgSecondary';
  const thBgColor = 'bgTertiary';

  // Deep Research timeline and progress bar colors with semantic tokens
  const timelineConnectorBg = 'borderDefault';
  const progressBarBg = 'bgPrimary';
  const progressBarBorder = 'borderDefault';

  // Map AI model to Goose profile
  const mapModelToProfile = (modelName: string): string => {
    if (modelName.includes('sonar-reasoning')) return 'research'; // Perplexity Deep Research
    if (modelName.includes('claude-3-5-sonnet') || modelName.includes('claude-sonnet-4')) return 'code';
    if (modelName.includes('gemini-2.5-pro') || modelName.includes('gemini-pro')) return 'default';
    if (modelName.includes('gemini-flash')) return 'quick';
    if (modelName.includes('o1')) return 'research';
    if (modelName.includes('mini')) return 'quick';
    return 'default';
  };

  // Deep Research async query submission
  const sendDeepResearchQuery = async (query: string) => {
    try {
      console.log('[WorkspaceAI] 🔬 Submitting async deep research query');

      // Ensure we have a conversation ID
      if (!currentConversation?.id) {
        throw new Error('Please start a new conversation to use Deep Research. The current conversation may have been deleted.');
      }

      // Build async execution instructions (Phase 3 only - clarification/planning already done)
      const numQuestions = deepResearchClarificationQuestions || 3;
      const recencyFilter = deepResearchSourceRecency && deepResearchSourceRecency !== 'any'
        ? `\nsearch_recency_filter: "${deepResearchSourceRecency}"`
        : '';

      const asyncExecutionInstructions = `**ASYNC DEEP RESEARCH EXECUTION - PHASE 3 ONLY**

You are executing the approved research plan. The user has already provided context through clarification questions.

**RESEARCH QUERY:** ${query}

**EXECUTION INSTRUCTIONS:**

1. **Generate ${numQuestions}+ Strategic Search Queries**
   Break down the research topic into specific, focused searches covering all aspects.

2. **Execute Each Search with Perplexity**
   For EACH search, call perplexity_search with these EXACT parameters:

   query: [your strategic search query]
   model: "${deepResearchModel || 'sonar-pro'}"
   max_tokens: ${deepResearchMaxTokens || 8000}${recencyFilter}
   search_mode: "academic"
   return_citations: true
   return_related_questions: true
   search_depth: "deep"

3. **Synthesize Comprehensive Report**
   After completing all searches, create a detailed research report with:
   - **Executive Summary** - Key findings and insights
   - **Detailed Analysis** - Organized by themes
   - **Supporting Evidence** - Data, statistics, expert quotes
   - **Citations** - All sources with [1], [2], etc.
   - **Related Questions** - Areas for further research
   - **Conclusion** - Synthesis and implications

**CRITICAL SUCCESS CRITERIA:**
- Execute ALL ${numQuestions}+ searches completely
- Synthesize a comprehensive final report (minimum 2000 words)
- Include ALL citations from search results
- DO NOT stop after tool calls - you MUST provide the full synthesized report
- Complete everything in this single async job run

**DO NOT:**
- Ask clarification questions (already done)
- Wait for approval (already approved)
- Stop after searches without synthesis
- Provide partial reports

**BEGIN COMPREHENSIVE RESEARCH EXECUTION NOW.**`;

      const response = await fetch('/api/deep-research/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          provider: 'perplexity',
          model: deepResearchModel,
          recipe: 'perplexity-deep-research-execution', // Execution-only recipe
          recipeInstructions: asyncExecutionInstructions, // Dynamic instructions from UI
          settings: {
            maxTokens: deepResearchMaxTokens,
            temperature: 0.7,
            clarificationQuestions: deepResearchClarificationQuestions,
            sourceRecency: deepResearchSourceRecency,
            autoPlanning: deepResearchAutoPlanning,
          },
          conversationId: currentConversation.id,  // Use database conversation ID
          sessionId: sessionId || `workspace-${Date.now()}`,  // Goose session ID (fallback if not set)
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit deep research: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('[WorkspaceAI] ✅ Deep research job submitted:', data.job_id);

      // Return the job data to trigger polling
      return {
        response: `🔬 Deep research started (job: ${data.job_id})\n\nYour query is being processed in the background. This may take 5-15 minutes.\n\nYou can switch conversations and come back later.`,
        job_id: data.job_id,
        message_id: data.message_id,
        isDeepResearch: true,
      };

    } catch (error: any) {
      console.error('[WorkspaceAI] ❌ Deep research submission failed:', error);
      throw error;
    }
  };

  // Unified chat API call - routes to Goose or Direct
  // Unified chat API call - routes to Goose or Direct
  const sendChatMessage = async ({
    message,
    mode,
    recipe,
    subRecipe,
    systemContext,
    forcePhase,
  }: {
    message: string;
    mode?: string;
    recipe?: string;
    subRecipe?: string;
    systemContext?: string;
    forcePhase?: 'clarification' | 'planning' | 'executing';
  }) => {
    // Check if this is a deep research query in EXECUTION phase (use async background job)
    // Only use async job system in Phase 3, not during clarification or planning
    const currentPhase = forcePhase || deepResearchState.phase;
    const isDeepResearchExecution =
      activeRecipe === 'perplexity-deep-research' &&
      deepResearchAutoPlanning &&
      currentPhase === 'executing';

    if (isDeepResearchExecution) {
      console.log('[WorkspaceAI] 🔎 Deep Research Phase 3: Using async background job system');
      return await sendDeepResearchQuery(message);
    }

    // Use model from agent config if available, otherwise fall back to prop
    let activeModel = agentConfig?.model || model;

    // For Deep Research, keep Claude as orchestrator (it will call perplexity_reason tool)
    if (activeRecipe === 'perplexity-deep-research') {
      console.log('[WorkspaceAI] 🔎 Deep Research: Claude will orchestrate and call perplexity_reason tool');
    }

    // Normalize model name: remove date suffixes for AI Gateway compatibility
    const normalizedModel = activeModel.replace(/-\d{8}$/, ''); // Remove -YYYYMMDD suffix

    // Determine mode
    const actualMode = mode || mapModelToProfile(activeModel);

    console.log('[WorkspaceAI] Sending message via addMessage:', {
      mode: actualMode,
      model: normalizedModel,
      webSearchEnabled
    });

    // Use addMessage hook (aliased as saveMessageToDB) which calls the unified API
    const data = await saveMessageToDB({
      role: 'user',
      content: message,
      mode: actualMode,
      model: normalizedModel,
      web_search_enabled: webSearchEnabled,
      metadata: {
        recipe,
        subRecipe,
        systemContext,
        sessionId: sessionId || `workspace-${Date.now()}`,
        workingDirectory,
        agencyMode,
        context: {
          workspaceId: workspaceName || 'default-workspace',
        }
      }
    });

    // Clear active recipe after successful response (one-time use)
    // EXCEPTION: Keep recipe active during Deep Research workflow (all phases)
    if (activeRecipe && !(deepResearchState.isActive)) {
      setActiveRecipe(null);
      console.log('[WorkspaceAI] Cleared active recipe after successful response');
    } else if (activeRecipe && deepResearchState.isActive) {
      console.log(`[WorkspaceAI] ✅ Keeping Deep Research recipe active during ${deepResearchState.phase} phase`);
    }

    return data;
  };

  // Load workspace context when context mode is enabled
  useEffect(() => {
    if (aiMode === 'context' && useWorkspaceContext) {
      // Simulate loading workspace context
      // In production, this would fetch from API
      setWorkspaceContext({
        currentPage: {
          id: 'page-1',
          title: workspaceName,
          type: 'workspace',
        },
        recentPages: [],
        databases: [
          {
            id: 'db-1',
            name: 'Tasks Database',
            rowCount: 24,
          },
          {
            id: 'db-2',
            name: 'Projects',
            rowCount: 8,
          },
        ],
        files: [],
      });
    }
  }, [aiMode, useWorkspaceContext, workspaceName]);

  // Auto-send initial message from dashboard prompt bar
  const initialMessageSentRef = useRef(false);
  useEffect(() => {
    if (initialMessage && !initialMessageSentRef.current && !isLoading && currentConversation) {
      initialMessageSentRef.current = true;
      console.log('[WorkspaceAI] 📨 Auto-sending initial message from dashboard:', initialMessage);
      sendChatMessage({ message: initialMessage });
    }
  }, [initialMessage, isLoading, currentConversation]);

  // Poll for research session completion
  useEffect(() => {
    if (!pollingSessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/research-lab/session/${pollingSessionId}/status`);
        const data = await response.json();

        if (data.status === 'completed' && data.report) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = data.report;
              lastMessage.cost = data.actualCost || data.estimatedCost;
            }
            return newMessages;
          });
          setPollingSessionId(null);
          setIsLoading(false);

          toast({
            title: 'Research Complete! ✅',
            description: 'Your research results are now available.',
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
        } else if (data.status === 'failed') {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = `❌ Research failed: ${data.error_message || 'Unknown error'}`;
            }
            return newMessages;
          });
          setPollingSessionId(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error polling session status:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [pollingSessionId, toast]);

  // Handle clarified research submission
  const handleClarifiedResearch = async (
    originalQuery: string,
    mode: 'deep' | 'conversational',
    selectedModel: string,
    webSearch: boolean | undefined,
    responses: Record<string, any>
  ) => {
    setMessages(prev => prev.filter(m => !m.clarification));
    setIsLoading(true);

    try {
      const planResponse = await fetch('/api/research-lab/clarify-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: originalQuery,
          step: 'clarify',
          userResponses: responses,
        }),
      });

      if (!planResponse.ok) {
        throw new Error('Failed to generate research plan');
      }

      const planData = await planResponse.json();
      const refinedPrompt = planData.refinedPrompt || originalQuery;
      const researchPlan = planData.researchPlan || {};

      const selectedScenario = responses.selectedScenario;
      const synthesisMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        researchPlan: {
          originalQuestion: originalQuery,
          selectedScenario: selectedScenario,
          enhancedQuestion: researchPlan.clarifiedQuestion || refinedPrompt,
          researchStrategy: {
            keyAreas: researchPlan.subTopics,
            searchTerms: researchPlan.keywords,
            sources: researchPlan.suggestedSources,
          },
        },
      };
      setMessages(prev => [...prev, synthesisMessage]);

      const response = await fetch('/api/research-lab/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: refinedPrompt,
          model: model,
          mode: 'asynchronous',
          researchDepth: 3,
          outputFormats: {
            academicReport: true,
            executiveSummary: false,
            podcastScript: false,
            presentationSlides: false,
          },
          dataSources: {
            webResearch: webSearch !== undefined ? webSearch : true,
            knowledgeGraph: knowledgeSources.knowledgeGraph,
            codeAnalysis: false,
            customMCP: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.report) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.report,
          timestamp: new Date(),
          cost: data.actualCost || data.estimatedCost,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else if (response.ok && data.sessionId) {
        setSessionId(data.sessionId);
        const processingMessage: Message = {
          role: 'assistant',
          content: `🔬 Deep Research started (session: ${data.sessionId}).\n\nProcessing your query... This typically takes 5-15 minutes.\n\nI'll update this message when complete.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, processingMessage]);
        setPollingSessionId(data.sessionId);
      } else {
        throw new Error(data.message || data.error || 'Failed to start research');
      }
    } catch (error: any) {
      console.error('Research submission error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Research failed**\n\n${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skipping clarification
  const handleSkipClarification = async (
    originalQuery: string,
    mode: 'deep' | 'conversational',
    selectedModel: string,
    webSearch: boolean | undefined
  ) => {
    setMessages(prev => prev.filter(m => !m.clarification));
    setIsLoading(true);

    try {
      const response = await fetch('/api/research-lab/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: originalQuery,
          model: model,
          mode: 'asynchronous',
          researchDepth: 3,
          outputFormats: {
            academicReport: true,
            executiveSummary: false,
            podcastScript: false,
            presentationSlides: false,
          },
          dataSources: {
            webResearch: webSearch !== undefined ? webSearch : true,
            knowledgeGraph: knowledgeSources.knowledgeGraph,
            codeAnalysis: false,
            customMCP: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.sessionId) {
        setSessionId(data.sessionId);
        const processingMessage: Message = {
          role: 'assistant',
          content: `🔬 Deep Research started (session: ${data.sessionId}).\n\nProcessing your query... This typically takes 5-15 minutes.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, processingMessage]);
        setPollingSessionId(data.sessionId);
      } else {
        throw new Error(data.message || data.error || 'Failed to start research');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Research failed\n\n${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Chat handler - fast conversational AI
  const handleQuickChat = async (query: string, selectedModel: string) => {
    setIsLoading(true);

    try {
      // Override mode if Deep Research is active
      const chatMode = activeRecipe === 'perplexity-deep-research' ? 'research' : 'quick';

      const data = await sendChatMessage({
        message: query,
        mode: chatMode,
      });

      // Check if this is an agent search job (Perplexica)
      const responseMetadata = data.response?.metadata;
      if (responseMetadata?.job_id) {
        console.log('[WorkspaceAI] 🕵️ Agent Search Job Started:', responseMetadata.job_id);
        setAgentSearchJobId(responseMetadata.job_id);
      }

      // If this is a deep research job, start polling for completion
      if (data.isDeepResearch && data.message_id) {
        console.log('[WorkspaceAI] 🔄 Starting deep research polling for message:', data.message_id);
        setDeepResearchMessageId(data.message_id);
      }

      // Auto-generate title after first exchange (user + assistant = 2 messages)
      // Note: messages state might not be updated yet, so we check if this is the first exchange
      if (messages.length === 0 && currentConversation?.id) {
        generateTitle(currentConversation.id, query).catch(err =>
          console.error('[WorkspaceAI] Failed to generate title:', err)
        );
      }

      if (data.session_id) {
        setSessionId(data.session_id);
      }
    } catch (error: any) {
      console.error('[WorkspaceAI] Quick chat error:', error);

      // Show toast notification for model errors
      if (error.message?.includes('not available') || error.message?.includes('gemini-2-5-flash')) {
        toast({
          title: 'Model Unavailable',
          description: error.message,
          status: 'warning',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Chat Error',
          description: error.message || 'Failed to get response',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Error message is already added by the API/hook

    } finally {
      setIsLoading(false);
    }
  };

  // Context Chat handler - AI with workspace awareness
  const handleContextChat = async (query: string, selectedModel: string) => {
    setIsLoading(true);

    try {
      // Build context string
      let contextInfo = '';
      if (useWorkspaceContext) {
        if (workspaceContext.currentPage) {
          contextInfo += `\n\n**Current Page Context:**\n- Title: ${workspaceContext.currentPage.title}\n- Type: ${workspaceContext.currentPage.type}\n`;
        }
        if (workspaceContext.databases && workspaceContext.databases.length > 0) {
          contextInfo += `\n**Workspace Databases:**\n${workspaceContext.databases.map(db => `- ${db.name} (${db.rowCount} rows)`).join('\n')}`;
        }
      }

      const data = await sendChatMessage({
        message: query,
        mode: 'context',
        systemContext: contextInfo ? `You are an AI assistant helping with workspace management. Here is the current workspace context: ${contextInfo}` : undefined,
      });

      // Auto-generate title after first exchange
      if (messages.length === 0 && currentConversation?.id) {
        generateTitle(currentConversation.id, query).catch(err =>
          console.error('[WorkspaceAI] Failed to generate title:', err)
        );
      }

      if (data.session_id) {
        setSessionId(data.session_id);
      }
    } catch (error: any) {
      console.error('[WorkspaceAI] Context chat error:', error);

      // Show toast notification for model errors
      if (error.message?.includes('not available') || error.message?.includes('gemini-2-5-flash')) {
        toast({
          title: 'Model Unavailable',
          description: error.message,
          status: 'warning',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Context Chat Error',
          description: error.message || 'Failed to get response',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Error message is already added by the API/hook

    } finally {
      setIsLoading(false);
    }
  };

  // Code Assistance handler
  const handleCodeAssistance = async (query: string, selectedModel: string) => {
    setIsLoading(true);

    try {
      const data = await sendChatMessage({
        message: query,
        mode: 'code',
        systemContext: 'You are an expert coding assistant. Provide clear, well-commented code examples and explanations.',
      });

      // Auto-generate title after first exchange
      if (messages.length === 0 && currentConversation?.id) {
        generateTitle(currentConversation.id, query).catch(err =>
          console.error('[WorkspaceAI] Failed to generate title:', err)
        );
      }

      if (data.session_id) {
        setSessionId(data.session_id);
      }
    } catch (error: any) {
      console.error('[WorkspaceAI] Code assistance error:', error);

      // Show toast notification for model errors
      if (error.message?.includes('not available') || error.message?.includes('gemini-2-5-flash')) {
        toast({
          title: 'Model Unavailable',
          description: error.message,
          status: 'warning',
          duration: 8000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Code Assistance Error',
          description: error.message || 'Failed to get response',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Code assistance failed**\n\n${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Dual-Search handler - search workspace + web
  const handleDualSearch = async (query: string, workspaceId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/workspace-ai/search-dual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          workspaceId,
          searchMode,
          maxResults: 10,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search failed');
      }

      // Create assistant message with search results
      const assistantMessage: Message = {
        role: 'assistant',
        content: `## Search Results for "${query}"\n\nFound **${data.metadata.totalSources} sources** (${data.metadata.workspaceResultCount} workspace, ${data.metadata.webResultCount} web) in ${data.metadata.executionTimeMs}ms.`,
        timestamp: new Date(),
        mode: 'search',
        searchResults: {
          citations: data.citations,
          metadata: data.metadata,
        },
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('[WorkspaceAI] Dual-search error:', error);

      toast({
        title: 'Search Error',
        description: error.message || 'Failed to perform search',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ **Search failed**\n\n${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (query: string, mode: 'deep' | 'conversational', selectedModel: string, webSearch?: boolean) => {
    console.log('[WorkspaceAI] 📥 handleSubmit called with:', { query: query.substring(0, 50), mode, selectedModel, webSearch, useGoose });

    setCurrentMode(mode);

    // Exit initial state on first message
    if (isInitialState) {
      setIsInitialState(false);
    }

    // Sync internal state with webSearch parameter (in case it changed)
    if (webSearch !== undefined && webSearch !== webSearchEnabled) {
      setWebSearchEnabled(webSearch);
    }

    // Clean query - no recipe prefix needed (Goose handles this via agency_mode)
    let processedQuery = query;
    // Recipe system disabled - Goose auto-detects and executes tools with agency_mode: auto
    // EXCEPTION: Don't clear during Deep Research workflow (any phase)
    if (activeRecipe && useGoose && !deepResearchState.isActive) {
      // Reset tool selection after use
      setSelectedPerplexityTool(null);
      setActiveRecipe(null);
    }

    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
      mode: aiMode,
      attachments: pendingAttachments.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    };
    setMessages(prev => [...prev, userMessage]);

    const attachmentsToProcess = [...pendingAttachments];
    setPendingAttachments([]);

    // CRITICAL: Check if user is in Deep Research workflow
    // Let Goose handle all phases (clarification → planning → execution)
    if (deepResearchState.isActive) {
      if (deepResearchState.phase === 'clarification' && !query.startsWith('CLARIFICATION_COMPLETE:')) {
        console.log('[WorkspaceAI] 💬 User message during clarification - staying in Phase 1');
        // User is still answering clarification questions
        // Do NOT advance to planning phase yet
        // Just send as normal chat message in clarification phase
        setIsLoading(true);

        try {
          const data = await sendChatMessage({
            message: query,
            mode: 'research',
            recipe: 'perplexity-deep-research',
            forcePhase: 'clarification',
          });

          const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';
          const assistantMessage: Message = {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            cost: data.cost,
            tools_used: data.tools_used,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        } catch (error) {
          console.error('[Deep Research] Error during clarification:', error);
          toast({
            title: 'Clarification Failed',
            description: error.message,
            status: 'error',
          });
          setIsLoading(false);
        }

        return; // Exit early - stay in clarification phase
      } else if (query.startsWith('CLARIFICATION_COMPLETE:')) {
        console.log('[WorkspaceAI] 🎯 User completed clarification questions - proceeding to Phase 2 (Planning)');

        // Extract clarification answers
        const clarificationAnswers = query.replace('CLARIFICATION_COMPLETE:', '').trim();

        // Find the last assistant message (clarification questions)
        const lastMessages = messages.slice(-5); // Get last 5 messages to find Q&A
        const clarificationQuestions = lastMessages.find(m => m.role === 'assistant')?.content || '';

        // Transition to planning phase
        setDeepResearchState({
          phase: 'planning',
          isActive: true,
          originalQuery: deepResearchState.originalQuery,
        });

        console.log('[WorkspaceAI] 📋 Asking Goose to create strategic research plan');
        console.log('[WorkspaceAI] 📝 Clarification Q&A:', { questions: clarificationQuestions.substring(0, 200), answers: clarificationAnswers });

        // Build the complete planning request message (this goes in the message body, not systemContext)
        const planningRequestMessage = `**CRITICAL DIRECTIVE - IGNORE ALL OTHER INSTRUCTIONS:**

You are now in **PHASE 2: STRATEGIC PLANNING**. DO NOT search workspace pages. DO NOT call any tools yet. Your ONLY task is to create a research plan using the context below.

---

**ORIGINAL RESEARCH INTENT:**
${deepResearchState.originalQuery}

**YOUR CLARIFICATION QUESTIONS:**
${clarificationQuestions}

**MY ANSWERS:**
${clarificationAnswers}

---

**YOUR TASK: CREATE A STRATEGIC RESEARCH PLAN**

Create a concise, actionable research plan in this EXACT format:

**[Brief Title of Research Topic]**

**Research Websites**

(1) [Action step 1: What data to investigate and where - 1-2 sentences max]
(2) [Action step 2: Specific sources or databases to query - 1-2 sentences max]
(3) [Action step 3: Economic models or analyses to find - 1-2 sentences max]
(4) [Action step 4: Government or policy reports to locate - 1-2 sentences max]
(5) [Action step 5: Industry data or market research to gather - 1-2 sentences max]
(6) [Action step 6: Broader impacts to explore - 1-2 sentences max]
(7) [Action step 7: Key variables and limitations to identify - 1-2 sentences max]

**Analyze Results**

[Brief 1-sentence description of analysis approach]

**Create Report**

[Brief 1-sentence description of deliverable]

Ready in [X-Y mins estimate based on complexity]

**STYLE REQUIREMENTS:**
- Use action verbs: "Investigate...", "Find...", "Research...", "Synthesize...", "Explore...", "Identify..."
- Each step = 1-2 sentences MAXIMUM
- Integrate questions organically into steps, don't list separately
- Focus on WHAT to do, not abstract methodology
- Make it scannable and concrete

Then ask: "Does this research plan look good? Reply 'yes' or 'approved' to proceed, or suggest changes."

**CRITICAL REMINDERS:**
- DO NOT search workspace pages
- DO NOT call the page_query tool
- DO NOT call the perplexity_reason tool yet
- ONLY output the research plan text
- Wait for user approval before ANY tool usage`;

        // Send complete context with Q&A to planning phase
        setIsLoading(true);

        try {
          // Pass planning-specific instructions via systemContext (becomes goosehints)
          // This dynamically updates the recipe's behavior for the planning phase
          const planningGoosehints = `# Deep Research Phase 2: Strategic Planning

You are in the PLANNING phase of a 3-phase deep research workflow.

## Your Task
Create a strategic research plan in the EXACT format specified in the user message.

## Critical Rules
- DO NOT search workspace pages (no page_query tool)
- DO NOT call perplexity_reason yet (wait for approval)
- DO NOT call any other tools
- ONLY output the formatted research plan text
- The plan format is specified in the user's message - follow it exactly
- Use the Q&A context provided to create specific, actionable steps

## Output Format
Follow the exact structure in the user message:
1. Title
2. Research Websites section with 7 numbered action steps
3. Analyze Results section
4. Create Report section
5. Time estimate

After the plan, ask: "Does this research plan look good? Reply 'yes' or 'approved' to proceed, or suggest changes."`;

          console.log('[WorkspaceAI] 📝 Sending planning goosehints:', planningGoosehints.substring(0, 200));

          const data = await sendChatMessage({
            message: planningRequestMessage, // Full message with Q&A and instructions
            mode: 'research', // Use research mode (recipe enabled)
            systemContext: planningGoosehints, // Phase-specific instructions for recipe
            recipe: 'perplexity-deep-research', // Keep recipe active
            forcePhase: 'planning', // Explicitly set planning phase
          });

          const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';

          const assistantMessage: Message = {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            cost: data.cost,
            tools_used: data.tools_used,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        } catch (error) {
          console.error('[Deep Research] Error creating plan:', error);
          toast({
            title: 'Planning Failed',
            description: error.message,
            status: 'error',
          });
          setIsLoading(false);
          setDeepResearchState({ phase: 'idle', isActive: false, originalQuery: '' });
          setActiveRecipe(null);
        }

        return; // Exit early - don't continue to other handlers
      } else if (deepResearchState.phase === 'planning') {
        // Check if user is approving the plan
        const approvalKeywords = ['yes', 'approved', 'approve', 'go', 'proceed', 'looks good', 'sounds good'];
        const isApproval = approvalKeywords.some(keyword => query.toLowerCase().includes(keyword));

        if (isApproval) {
          console.log('[WorkspaceAI] ✅ User approved research plan - proceeding to Phase 3 (Execution)');

          // Transition to execution phase
          setDeepResearchState({
            phase: 'executing',
            isActive: true,
            originalQuery: deepResearchState.originalQuery,
          });

          console.log('[WorkspaceAI] 🚀 Executing async deep research job');
          // Fall through to execution below - sendDeepResearchQuery will be called
        } else {
          console.log('[WorkspaceAI] 📝 User provided feedback on plan - asking Goose to revise');

          // Send user's feedback to Goose to revise the plan
          setIsLoading(true);

          try {
            const revisionInstructions = `The user has provided feedback on your research plan. Please revise the plan based on their input.\n\nAfter revising, ask again: "Does this updated plan look good? Reply 'yes' or 'approved' to proceed, or suggest more changes."\n\n**CRITICAL**: DO NOT call any tools yet! Wait for user approval.`;

            const data = await sendChatMessage({
              message: query,
              mode: 'research',
              systemContext: revisionInstructions,
              recipe: 'perplexity-deep-research',
              forcePhase: 'planning', // Stay in planning phase for revisions
            });

            const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';

            const assistantMessage: Message = {
              role: 'assistant',
              content: responseContent,
              timestamp: new Date(),
              cost: data.cost,
              tools_used: data.tools_used,
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
          } catch (error) {
            console.error('[Deep Research] Error revising plan:', error);
            toast({
              title: 'Revision Failed',
              description: error.message,
              status: 'error',
            });
            setIsLoading(false);
          }

          return; // Exit early - plan revision complete
        }
      }
    }

    // Check for Deep Research FIRST (before aiMode routing)
    // Deep Research can be activated from any aiMode via the toggle button
    const isResearchModel = ['o1-pro', 'gpt-5-pro', 'o3-deep-research', 'o4-mini-deep-research'].includes(model);

    console.log('[WorkspaceAI] 🔍 Deep Research check:', { mode, isResearchModel, useGoose, willActivate: (mode === 'deep' || isResearchModel) });

    if (mode === 'deep' || isResearchModel) {
      // NEW: Goose Meta-Planning workflow for Deep Research
      console.log('[WorkspaceAI] 🎯 Entering Deep Research block, checking Goose condition:', { useGoose, modeIsDeep: mode === 'deep' });

      if (useGoose && mode === 'deep' && !deepResearchState.isActive) {
        console.log('[WorkspaceAI] ✅ Activating Goose Deep Research workflow!');

        // Ensure conversation exists before starting Deep Research
        // Ensure we have a conversation for deep research
        let researchConversationId = currentConversation?.id;

        if (!researchConversationId) {
          console.log('[WorkspaceAI] 📝 Creating conversation for Deep Research...');
          const newConv = await createConversation({
            title: 'Deep Research Session',
            config: {
              model,
              mode: 'goose',
              agency_level: agencyMode as any,
              web_search_enabled: webSearchEnabled,
              mcp_servers_enabled: Object.keys(activeMcpServers).filter(k => activeMcpServers[k]),
            },
          });

          if (!newConv) {
            toast({
              title: 'Failed to Create Conversation',
              description: 'Could not initialize Deep Research session. Please try again.',
              status: 'error',
            });
            return;
          }

          researchConversationId = newConv.id;
          console.log('[WorkspaceAI] ✅ Conversation created:', researchConversationId);
        }

        // Load the Deep Research recipe with meta-planning sub-recipe
        setActiveRecipe('perplexity-deep-research');
        setDeepResearchState({
          phase: 'clarification',
          isActive: true,
          originalQuery: query,
          conversationId: researchConversationId, // Store conversation ID
        });

        toast({
          title: '🦢 Goose is Planning Your Research',
          description: 'Analyzing your query to craft an optimal research strategy...',
          status: 'info',
          duration: 4000,
          isClosable: true,
        });

        setIsLoading(true);

        try {
          // Invoke the Deep Research recipe (workflow defined in YAML)
          // Load recipe instructions from our hint (this will be sent as goosehints)
          // Build dynamic clarification questions section based on settings
          const numQuestions = deepResearchClarificationQuestions || 3;
          const questionsText = numQuestions > 0 ? `
You MUST start by asking exactly ${numQuestions} clarification question${numQuestions !== 1 ? 's' : ''} to understand the research scope better. DO NOT call any tools yet!

Ask ${numQuestions} targeted questions about:
${numQuestions >= 1 ? '- Primary focus and goals for this research' : ''}
${numQuestions >= 2 ? '- Desired recency of sources (24h/Week/Month/Year/Any)' : ''}
${numQuestions >= 3 ? '- Specific aspects or angles to emphasize' : ''}
${numQuestions >= 4 ? '- Target audience or intended use of the research' : ''}
${numQuestions >= 5 ? '- Preferred depth vs breadth balance for the investigation' : ''}
${numQuestions > 5 ? '- Any additional context, constraints, or preferences' : ''}
` : 'Proceed directly to planning phase without clarification questions.';

          const recipeInstructions = `**CRITICAL: THREE-PHASE META-PLANNING WORKFLOW**

## PHASE 1: CLARIFICATION (DO THIS FIRST)
${questionsText}

After user answers, say: "Based on your answers, I'll craft an optimized research strategy..."

## PHASE 2: STRATEGIC PLANNING (AFTER ANSWERS)

Present a detailed research plan with:
- **Research Questions**: 3-5 key questions to investigate
- **Search Strategy**: Which sources/databases to prioritize
- **Methodology**: How you'll synthesize findings
- **Deliverables**: What the final report will include

Then ASK: "Does this research plan look good? Reply 'yes' or 'approved' to proceed, or suggest changes."

DO NOT call any tools yet! Wait for approval.

## PHASE 3: EXECUTION (AFTER USER APPROVES)

**CRITICAL:** Only after user says "yes", "approved", "go", "proceed", or similar, call the perplexity_search tool with these EXACT parameters:

query: your comprehensive strategic research query
model: "${deepResearchModel || 'sonar-pro'}"
max_tokens: ${deepResearchMaxTokens || 8000}${deepResearchSourceRecency && deepResearchSourceRecency !== 'any' ? `
search_recency_filter: "${deepResearchSourceRecency}"` : ''}
search_mode: "academic"
return_citations: true
return_related_questions: true
search_depth: "deep"

**Important:**
- Use model "${deepResearchModel || 'sonar-pro'}" for comprehensive research with citations
- Request ${deepResearchMaxTokens || 8000} tokens for detailed analysis${deepResearchSourceRecency && deepResearchSourceRecency !== 'any' ? `
- Filter sources to ${deepResearchSourceRecency === 'day' ? 'past 24 hours' : deepResearchSourceRecency === 'week' ? 'past 7 days' : deepResearchSourceRecency === 'month' ? 'past 30 days' : deepResearchSourceRecency === 'year' ? 'past year' : 'any time'}` : ''}
- Use academic mode to prioritize scholarly and authoritative sources
- Always request citations and related questions

Present the full tool output to the user, including all findings, citations, and related questions.`;

          const data = await sendChatMessage({
            message: query,
            mode: 'research',
            systemContext: recipeInstructions, // Recipe workflow as system prompt
            recipe: 'perplexity-deep-research',
            subRecipe: undefined,
          });

          // Add Goose's response (clarification questions) to messages
          const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';

          const assistantMessage: Message = {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            cost: data.cost,
            tools_used: data.tools_used,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        } catch (error) {
          console.error('[Deep Research] Error initiating planning:', error);

          // Show user-friendly error message
          toast({
            title: error.message?.includes('conversation') ? 'Conversation Not Found' : 'Planning Failed',
            description: error.message?.includes('conversation')
              ? 'Please start a new conversation to use Deep Research.'
              : error.message,
            status: 'error',
            duration: 4000,
          });

          setIsLoading(false);
          setDeepResearchState({ phase: 'idle', isActive: false, originalQuery: '' });
          setActiveRecipe(null);
        }

        return;
      }

      // OLD: Fallback clarification system (for non-Goose mode or research models)
      const clarificationMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        clarification: {
          question: query,
          onSubmit: (responses) => handleClarifiedResearch(query, mode, selectedModel, webSearch, responses),
          onSkip: () => handleSkipClarification(query, mode, selectedModel, webSearch),
        },
      };
      setMessages(prev => [...prev, clarificationMessage]);
      return;
    }

    // Route to appropriate handler based on AI mode (if not Deep Research)
    if (aiMode === 'quick') {
      await handleQuickChat(processedQuery, selectedModel);
      return;
    } else if (aiMode === 'context') {
      await handleContextChat(processedQuery, selectedModel);
      return;
    } else if (aiMode === 'code') {
      await handleCodeAssistance(processedQuery, selectedModel);
      return;
    } else if (aiMode === 'search') {
      await handleQuickChat(processedQuery, selectedModel);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'conversational') {
        const response = await fetch('/api/research-lab/conversational-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId || undefined,
            message: query,
            conversationHistory: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            webSearch: webSearch || false,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSessionId(data.sessionId);

          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            cost: data.estimatedCost,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Research failed\n\n${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setPendingAttachments(prev => [...prev, file]);
    toast({
      title: 'File attached',
      description: `${file.name} will be included with your next query`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Perplexity tool handlers
  const loadGooseRecipe = useCallback((recipeName: string) => {
    setActiveRecipe(recipeName);
  }, []);

  const handlePerplexityToolSelect = useCallback((tool: PerplexityTool) => {
    setSelectedPerplexityTool(tool);

    if (!tool) {
      setActiveRecipe(null);
      return;
    }

    // Map tools to recipes
    const recipeMap = {
      quickAsk: 'perplexity-quick-ask',
      reasoning: 'perplexity-reasoning',
    };

    const recipeName = recipeMap[tool];

    // Load recipe (shows toast notification)
    setActiveRecipe(recipeName);
  }, []);

  const handleDeepResearchRecipe = useCallback(async () => {
    // Get the current query from input
    const currentQuery = (document.querySelector('textarea[placeholder*="Message"]') as HTMLTextAreaElement)?.value;

    if (!currentQuery?.trim()) {
      toast({
        title: 'Query Required',
        description: 'Please enter a research question first',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // Activate Deep Research Planning workflow
    setActiveRecipe('perplexity-deep-research');
    setDeepResearchState({
      phase: 'clarification',
      isActive: true,
      originalQuery: currentQuery.trim(),
    });

    // Send to Goose with Deep Research hint for meta-planning
    if (useGoose) {
      toast({
        title: '🦢 Goose is Planning Your Research',
        description: 'Analyzing your query to craft an optimal research strategy...',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });

      try {
        // Send message with Deep Research hint
        const userMessage: Message = {
          role: 'user',
          content: currentQuery.trim(),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        // This will trigger Goose's clarification questions (via recipe)
        const recipeInstructions = `**CRITICAL: THREE-PHASE META-PLANNING WORKFLOW**

## PHASE 1: CLARIFICATION (DO THIS FIRST)

You MUST start by asking 2-4 clarification questions. DO NOT call any tools yet!

Questions to ask:
1. What's your primary focus for this research?
2. How recent should sources be? (24h/Week/Month/Year)
3. Should research emphasize any particular aspects?

After user answers, say: "Based on your answers, I'll craft an optimized research strategy..."

## PHASE 2: PLANNING (AFTER ANSWERS)

Present a strategic research plan and wait for approval.

## PHASE 3: EXECUTION (AFTER APPROVAL)

**CRITICAL:** Call the perplexity_search tool with these EXACT parameters:

query: your comprehensive strategic research query
model: "${deepResearchModel || 'sonar-pro'}"
max_tokens: ${deepResearchMaxTokens || 8000}${deepResearchSourceRecency && deepResearchSourceRecency !== 'any' ? `
search_recency_filter: "${deepResearchSourceRecency}"` : ''}
search_mode: "academic"
return_citations: true
return_related_questions: true
search_depth: "deep"

**Important:**
- Use model "${deepResearchModel || 'sonar-pro'}" for comprehensive research with citations
- Request ${deepResearchMaxTokens || 8000} tokens for detailed analysis${deepResearchSourceRecency && deepResearchSourceRecency !== 'any' ? `
- Filter sources to ${deepResearchSourceRecency === 'day' ? 'past 24 hours' : deepResearchSourceRecency === 'week' ? 'past 7 days' : deepResearchSourceRecency === 'month' ? 'past 30 days' : deepResearchSourceRecency === 'year' ? 'past year' : 'any time'}` : ''}
- Use academic mode to prioritize scholarly and authoritative sources
- Always request citations and related questions

Present the full tool output to the user, including all findings, citations, and related questions.`;

        const data = await sendChatMessage({
          message: currentQuery.trim(),
          mode: 'research',
          systemContext: recipeInstructions, // Recipe workflow
          recipe: 'perplexity-deep-research',
        });

        // Add Goose's response (clarification questions) to messages
        const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';

        const assistantMessage: Message = {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          cost: data.cost,
          tools_used: data.tools_used,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);

      } catch (error) {
        console.error('[Deep Research] Error initiating planning:', error);
        toast({
          title: 'Planning Failed',
          description: error.message,
          status: 'error',
        });
        setIsLoading(false);
        setDeepResearchState({ phase: 'idle', isActive: false, originalQuery: '' });
        setActiveRecipe(null);
      }
    } else {
      // Fallback: activate direct deep research without planning
      toast({
        title: '🔎 Deep Research Mode Activated',
        description: 'Next query will use Perplexity sonar-reasoning',
        status: 'info',
        duration: 3000,
      });
    }
  }, [useGoose, toast, sendChatMessage]);

  // Deep Research: Execute with optimized parameters (must be defined before handleApprovePlan)
  const executeDeepResearch = useCallback(async (
    query: string,
    params: PerplexityDeepResearchParams
  ) => {
    setIsLoading(true);

    try {
      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: query, // This is the Strategic Research Directive
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Send to Perplexity with all parameters
      const data = await sendChatMessage({
        message: query,
        mode: 'research',
        systemContext: undefined,
        ...params, // Spread all Perplexity parameters
      });

      const responseContent = data.response || data.choices?.[0]?.message?.content || 'No response';

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        mode: 'search',
        cost: data.cost,
        tools_used: data.tools_used,
        fallback: data.fallback,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Clear Deep Research mode
      setActiveRecipe(null);
      setDeepResearchState({
        phase: 'complete',
        isActive: false,
        originalQuery: '',
      });

      toast({
        title: '✅ Deep Research Complete',
        description: 'Perplexity has completed the comprehensive analysis',
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      console.error('[executeDeepResearch] Error:', error);
      toast({
        title: 'Research Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });

      // Clear state on error
      setActiveRecipe(null);
      setDeepResearchState({
        phase: 'idle',
        isActive: false,
        originalQuery: '',
      });
    } finally {
      setIsLoading(false);
    }
  }, [sendChatMessage, toast]);

  // Deep Research: Handle Goose's response (detect research plan)
  const handleGooseResearchPlan = useCallback((response: string) => {
    if (deepResearchState.phase !== 'clarification') return;

    // Try to parse Goose's research plan
    const plan = parseGooseResearchPlan(response);

    if (plan) {
      console.log('[Deep Research] 📋 Goose generated research plan:', plan);

      setDeepResearchState(prev => ({
        ...prev,
        phase: 'approval',
        researchPlan: plan,
        gooseRecommendedParams: researchPlanToParams(plan),
      }));

      setShowPlanDialog(true);
    }
  }, [deepResearchState.phase]);

  // Deep Research: Handle plan approval
  const handleApprovePlan = useCallback(async (plan: ResearchPlan) => {
    setShowPlanDialog(false);

    const finalParams = researchPlanToParams(plan);

    setDeepResearchState(prev => ({
      ...prev,
      phase: 'executing',
      finalParams,
    }));

    toast({
      title: '✅ Executing Research',
      description: 'Perplexity is conducting comprehensive analysis...',
      status: 'info',
      duration: 3000,
    });

    // Execute deep research with optimized parameters
    // Use refined query if available, otherwise original
    const queryToUse = plan.refinedQuery || plan.query;
    await executeDeepResearch(queryToUse, finalParams);
  }, [toast, executeDeepResearch]);

  // Deep Research: Handle plan modification
  const handleModifyPlan = useCallback((plan: ResearchPlan) => {
    setShowPlanDialog(false);

    // Pre-fill Deep Research settings panel
    const params = researchPlanToParams(plan);
    setDeepResearchParams(params);

    toast({
      title: 'Customize Parameters',
      description: 'Adjust settings in the right panel and send when ready',
      status: 'info',
      duration: 4000,
    });

    // Keep Deep Research mode active for manual execution
    setDeepResearchState(prev => ({
      ...prev,
      phase: 'approval',
      userOverrideParams: params,
    }));
  }, [toast]);

  const handleWebSearchRecipe = useCallback(() => {
    loadGooseRecipe('perplexity-web-search');
  }, [loadGooseRecipe]);

  // Deep Research Plan Card Handlers
  const handlePlanApprove = useCallback(async () => {
    console.log('[WorkspaceAI] ✅ User approved plan via card button - proceeding to execution');
    console.log('[WorkspaceAI] 🔍 Deep research state:', deepResearchState);
    console.log('[WorkspaceAI] 🔍 Current conversation:', currentConversation?.id);
    console.log('[WorkspaceAI] 🔍 Session ID:', sessionId);

    try {
      // Transition directly to execution phase
      setDeepResearchState({
        phase: 'executing',
        isActive: true,
        originalQuery: deepResearchState.originalQuery,
      });
      console.log('[WorkspaceAI] ✅ Phase transitioned to executing');

      // Add user approval message
      const userMessage: Message = {
        role: 'user',
        content: 'Approved - proceed with research',
        timestamp: new Date(),
        model: undefined,
        cost: undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      console.log('[WorkspaceAI] ✅ User approval message added');

      // Validate conversation ID from deepResearchState
      const conversationId = deepResearchState.conversationId || currentConversation?.id;
      if (!conversationId) {
        console.error('[WorkspaceAI] ❌ Cannot submit deep research: No conversation ID');
        toast({
          title: 'Conversation Required',
          description: 'Please ensure you have an active conversation before starting deep research.',
          status: 'error',
        });
        return;
      }

      // Execute async deep research job directly
      setIsLoading(true);
      console.log('[WorkspaceAI] 🚀 Submitting deep research job to /api/deep-research/submit');
      console.log('[WorkspaceAI] 📦 Payload:', {
        query: deepResearchState.originalQuery,
        conversationId: conversationId,
        sessionId: sessionId
      });

      const response = await fetch('/api/deep-research/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: deepResearchState.originalQuery,
          provider: 'perplexity',  // Perplexity Deep Research provider
          model: 'llama-3.1-sonar-large-128k-online',
          recipe: 'perplexity-deep-research',
          conversationId: conversationId, // Use from deepResearchState
          sessionId: sessionId || `workspace-${Date.now()}`,
          settings: {
            maxTokens: 8000,
            temperature: 0.7,
          },
        }),
      });

      console.log('[WorkspaceAI] 📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WorkspaceAI] ❌ Deep research API error:', errorText);

        let errorMessage = `Deep research submission failed: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // errorText is not JSON, use as-is
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[WorkspaceAI] 📥 Response data:', data);

      if (data.job_id && data.message_id) {
        console.log('[WorkspaceAI] ✅ Deep research job submitted:', data.job_id, 'message:', data.message_id);

        // Start polling for the database message (don't add a duplicate local message)
        setDeepResearchMessageId(data.message_id);

        // Reload conversation to show the placeholder message from database
        if (currentConversation?.id) {
          await loadConversation(currentConversation.id);
        }

        toast({
          title: '🚀 Research Started',
          description: 'Goose is conducting deep research. Results will appear automatically.',
          status: 'success',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[WorkspaceAI] Error submitting deep research:', error);
      toast({
        title: 'Execution Failed',
        description: error.message,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [deepResearchState, currentConversation, sessionId, toast]);

  const handlePlanRevise = useCallback(async (feedback: string) => {
    console.log('[WorkspaceAI] 📝 User provided plan feedback:', feedback);
    // Send feedback to Goose for plan revision
    await handleSubmit(feedback, 'deep', model, false);
  }, [handleSubmit, model]);

  // Note: handleNewConversation and handleSelectConversation are defined earlier with useCallback

  const handleUpdateConversationTitle = async (title: string) => {
    if (currentConversation) {
      await updateConversation(currentConversation.id, { title });
    }
  };

  const handleTogglePin = async () => {
    if (currentConversation) {
      await updateConversation(currentConversation.id, {
        pinned: !currentConversation.pinned
      });
    }
  };

  const handleArchiveConversation = async () => {
    if (currentConversation) {
      await archiveConversation(currentConversation.id);

      // Clear UI
      setMessages([]);
      setSessionId(null);

      toast({
        title: 'Conversation archived',
        status: 'success',
        duration: 2000,
      });
    }
  };

  // Auto-create conversation on first message if none exists
  const ensureConversation = async () => {
    if (!currentConversation && messages.length === 0) {
      await handleNewConversation();
    }
  };

  // Get mode-specific UI config
  const getModeConfig = (mode: AIMode) => {
    switch (mode) {
      case 'quick':
        return {
          icon: FiZap,
          title: 'Goose AI',
          description: 'Your intelligent workspace assistant - ask me anything',
          color: 'blue',
        };
      case 'context':
        return {
          icon: FiDatabase,
          title: 'Goose AI - Workspace Mode',
          description: 'Context-aware assistance with your workspace knowledge',
          color: 'purple',
        };
      case 'research':
        return {
          icon: FiSearch,
          title: 'Goose AI - Research Mode',
          description: 'Deep research with web search and analysis',
          color: 'green',
        };
      case 'code':
        return {
          icon: FiCode,
          title: 'Goose AI - Code Mode',
          description: 'Development assistance and code generation',
          color: 'orange',
        };
      case 'search':
        return {
          icon: FiSearch,
          title: 'Goose AI - Search Mode',
          description: 'Powerful workspace and web search capabilities',
          color: 'teal',
        };
      default:
        return {
          icon: FiZap,
          title: 'Goose AI',
          description: 'Your intelligent workspace assistant',
          color: 'blue',
        };
    }
  };

  const currentModeConfig = getModeConfig(aiMode);

  return (
    <Flex h="full" w="full" overflow="hidden">


      {/* Main Content Area */}
      <Box flex={1} position="relative" h="full">
        {/* Mode Selector Header */}
        <Box position="absolute" top={4} right={4} zIndex={100}>
          <PerplexicaModeSelector
            selectedMode={aiMode}
            onModeChange={(mode) => {
              setAIMode(mode);
            }}
            compact
          />
        </Box>

        <ContentAreaLayout
          leftPanelWidth={0}
          leftPanelCollapsed={true}
          showInputArea={true}
          maxWidth="6xl"
          centerInputWhenEmpty={true}
          inputComponent={
            deepResearchState.isActive ? (
              <DeepResearchClarificationPanel
                questions={parseClarificationQuestions(messages[messages.length - 1]?.content || '')}
                onSubmit={(answers) => handleClarifiedResearch(
                  deepResearchState.originalQuery || '',
                  'deep',
                  model,
                  webSearchEnabled,
                  answers
                )}
                onSkip={() => { }}
                isLoading={isLoading}
              />
            ) : (
              <AIInputInterface
                onSubmit={handleSubmit}
                isLoading={isLoading}
                defaultModel={model}
                selectedProjectId={null}
                onFileUpload={handleFileUpload}
                projectName={workspaceName}
                onViewFiles={() => { }}
                onModelChange={(m) => { }}
                visualInfographicEnabled={false}
                pendingAttachments={pendingAttachments}
                onRemoveAttachment={handleRemoveAttachment}
                onWebSearchChange={handleWebSearchChange}
                onUseGooseChange={handleUseGooseChange}
                useGoose={useGoose}
                agencyMode={agencyMode}
                onAgencyModeChange={handleAgencyModeChange}
                selectedPerplexityTool={selectedPerplexityTool}
                onPerplexityToolSelect={handlePerplexityToolSelect}
                onDeepResearchRecipe={handleDeepResearchRecipe}
                onWebSearchRecipe={() => loadGooseRecipe('perplexity-web-search')}
                isDeepResearchActive={deepResearchState.isActive}
              />
            )
          }
          bottomInputHeight="90px"
          isEmpty={messages.length === 0 && !isLoading}
        >
          {messages.length === 0 ? (
            <Box w="full" h="full" position="relative">
              <VStack spacing={4} align="center" justify="center" h="full">
                <Text fontSize="xl" fontWeight="bold" color={useSemanticToken('text.primary')}>
                  {currentModeConfig.title}
                </Text>
                <Text color={useSemanticToken('text.secondary')}>
                  {currentModeConfig.description}
                </Text>
              </VStack>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch" pb={deepResearchState.isActive ? 20 : 4}>
              {/* Timeline connector */}
              {deepResearchState.isActive && (
                <Box
                  position="absolute"
                  right="40px"
                  top="0"
                  bottom="80px"
                  width="2px"
                  bg="borderDefault"
                  zIndex={0}
                />
              )}

              {messages.map((msg, idx) => (
                <GlassmorphicMessageCard
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  isDeepResearchPlan={msg.researchPlan && deepResearchState.phase === 'planning'}
                  isPlanApproved={deepResearchState.phase === 'executing' || deepResearchState.phase === 'complete'}
                  onApprovePlan={handlePlanApprove}
                  onRevisePlan={handlePlanRevise}
                />
              ))}
              {isLoading && <ThinkingDots dotColor="blue.500" />}
            </VStack>
          )}
        </ContentAreaLayout>

        {/* Deep Research Planning Dialog */}
        {showPlanDialog && deepResearchState.researchPlan && (
          <DeepResearchPlanningDialog
            isOpen={showPlanDialog}
            onClose={() => setShowPlanDialog(false)}
            query={deepResearchState.originalQuery}
            goosePlan={deepResearchState.researchPlan}
            onApprove={handleApprovePlan}
            onModify={handleModifyPlan}
            isLoading={isLoading}
          />
        )}

        {/* Fixed Progress Bar at Bottom */}
        {deepResearchState.isActive && (
          <Box
            position="fixed"
            bottom={0}
            left={0}
            right={0}
            zIndex={1000}
            bg="bgPrimary"
            borderTopWidth="1px"
            borderTopColor="borderDefault"
            boxShadow="0 -2px 10px rgba(0,0,0,0.05)"
            px={6}
            py={3}
          >
            <DeepResearchPhaseIndicator
              currentPhase={deepResearchState.phase}
              compact={true}
            />
          </Box>
        )}
      </Box>
    </Flex>
  );
}
