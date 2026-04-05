/**
 * Goose Agent Core
 * Fully self-contained agent component with all messaging logic internalized
 * Shared by both Floating and Sidebar modes - NO prop drilling!
 */

import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Badge,
  Divider,
  Spinner,
} from '@chakra-ui/react';
import { FiSend, FiPaperclip, FiGlobe, FiEdit, FiList, FiCheckSquare, FiCode, FiDatabase } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { BlockModel, BlockType } from '@/lib/editor/BlockModel';
import { ChatTextarea } from '@/components/shared/ChatTextarea';
import { AnimatedGooseIcon } from '@/components/shared/AnimatedGooseIcon';
import { ThinkingAccordion } from './ThinkingAccordion';
import { useGooseMessaging } from '@/hooks/useGooseMessaging';
import { useAgentConfiguration } from '@/hooks/useAgentConfiguration';
import { blockOperations } from '@/services/goose/BlockOperations';
import type { GooseMessage } from '@/hooks/useGooseMessaging';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { AIInputText } from '@/components/shared/AIInputText';
import { useRecipes } from '@/hooks/useRecipes';

/**
 * Parse and strip <think> tags from message content
 * Returns cleaned content and extracted thinking text
 */
function parseThinkTags(content: string): { cleanContent: string; thinkingText: string | null } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  const thinkingText = thinkMatch ? thinkMatch[1].trim() : null;
  const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return { cleanContent, thinkingText };
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  badge?: string;
}

interface GooseAgentCoreProps {
  pageTitle: string;
  pageId: string;
  mode: 'floating' | 'sidebar';
  blockModelRef?: React.RefObject<BlockModel | null>;
  onPageUpdate?: () => void; // Callback to refresh page after agent makes changes
  onStreamingChunk?: (chunk: string) => void; // Callback for streaming text
  mcpServers?: any; // MCP server configuration
}

export interface GooseAgentCoreRef {
  clearMessages: () => void;
}

export const GooseAgentCore = forwardRef<GooseAgentCoreRef, GooseAgentCoreProps>(({
  pageTitle,
  pageId,
  mode,
  blockModelRef,
  onPageUpdate,
  onStreamingChunk,
  mcpServers,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  // Generate persistent session ID
  const [sessionId] = useState(() => `page-agent-${Date.now()}`);
  // Track active recipe
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  // Initialize BlockOperations with the current BlockModel
  React.useEffect(() => {
    if (blockModelRef?.current) {
      blockOperations.setBlockModel(blockModelRef.current);
      console.log('[GooseAgentCore] ✅ BlockModel set in operations service');
    }
  }, [blockModelRef]);

  // Load agent configuration
  const { config: agentConfig, loading: configLoading } = useAgentConfiguration('page-agent');

  // Load recipes for badge display
  const { recipes } = useRecipes();

  // Build page context from current blocks
  const blocks = blockOperations.getAllBlocks();
  const pageContext = {
    pageId,
    pageTitle,
    pageContent: blocks.map(b => b.content.map(c => c.text).join('')).join('\n'),
    blocks,
    blockCount: blocks.length,
    wordCount: blocks.reduce((sum, b) =>
      sum + b.content.reduce((s, c) => s + c.text.split(/\s+/).length, 0), 0
    ),
  };

  // Use shared Goose messaging hook with streaming
  const {
    messages,
    isProcessing,
    session,
    sendMessage: sendGooseMessage,
    sendMessageStreaming,
    planSteps,
    thoughts,
    currentPlanStep,
    planProgress,
    clearMessages,
  } = useGooseMessaging({
    agentId: 'page-agent',
    sessionId,
    model: agentConfig?.model || 'claude-haiku-4-5',
    mode: 'quick',
    agencyMode: agentConfig?.agencyMode || 'auto',
    mcpServers: {
      ...mcpServers,
      workspace: true, // Always enable workspace tools for page agent
    },
    onPageUpdate, // Pass callback to trigger page refresh after tool calls
    onStreamingChunk, // Pass streaming callback
    context: pageContext,
    // Pass agent-specific settings if loaded
    temperature: agentConfig?.temperature,
    activeRecipeId,
  });

  // Use streaming for real-time updates
  const sendMessage = sendGooseMessage;

  // Expose clearMessages to parent
  useImperativeHandle(ref, () => ({
    clearMessages
  }));

  // Auto-scroll to bottom when content changes
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, planSteps?.length, thoughts?.length]);

  // Message handler
  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = message;
    setMessage('');

    await sendMessage(userMessage);
  };

  // Call all hooks at the top level, unconditionally
  const hoverBg = useSemanticToken('surface.hover');
  const inputBorder = 'blue.400';
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const badgeBg = useSemanticToken('surface.base');
  const badgeColor = useSemanticToken('text.secondary');
  const placeholderColor = useSemanticToken('text.tertiary');
  const sendBtnBg = useSemanticToken('surface.base');
  const sendBtnHoverBg = useSemanticToken('border.default');
  const userMsgBg = useSemanticToken('surface.base');
  const userMsgColor = useSemanticToken('text.primary');
  const assistantMsgColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Pre-compute all color values for sx prop (can't use hooks inside sx)
  const codeBg = useSemanticToken('surface.base');
  const codeColor = useSemanticToken('text.primary');
  const codeBorder = useSemanticToken('border.subtle');
  const preBg = useSemanticToken('surface.base');
  const preBorder = useSemanticToken('border.subtle');
  const headingColor = useSemanticToken('text.primary');
  const strongColor = useSemanticToken('text.primary');
  const blockquoteBorder = useSemanticToken('border.default');
  const userBubbleBg = useSemanticToken('surface.elevated');
  const userBubbleBorder = useSemanticToken('border.subtle');
  const gooseFilter = 'none';
  const gooseNameColor = useSemanticToken('text.secondary');

  // Page capability actions
  const handleAddBlock = (type: BlockType) => {
    if (!blockModelRef?.current) return;
    const block = blockModelRef.current.createBlock(type, [{ text: '' }], null, undefined, 'goose-ai');
    console.log(`[Goose] Added ${type} block:`, block.id);
  };

  const handleAnalyzePage = () => {
    if (!blockModelRef?.current) return;
    const blocks = blockModelRef.current.getAllBlocks();
    const analysis = {
      totalBlocks: blocks.length,
      blockTypes: blocks.reduce((acc, b) => {
        acc[b.type] = (acc[b.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      wordCount: blocks.reduce((sum, b) => {
        return sum + b.content.reduce((s, seg) => s + seg.text.split(/\s+/).length, 0);
      }, 0),
    };
    console.log('[Goose] Page analysis:', analysis);
    // Send analysis to chat
    setMessage(`Page Analysis:\n- Total blocks: ${analysis.totalBlocks}\n- Word count: ${analysis.wordCount}\n- Block types: ${JSON.stringify(analysis.blockTypes, null, 2)}`);
  };

  const quickActions: QuickAction[] = [
    { id: '1', icon: '/goose-icon.png', label: 'Personalize your Goose AI', badge: 'New' },
    { id: '2', icon: 'A文', label: 'Translate this page' },
    { id: '3', icon: '🔍', label: 'Analyze for insights', badge: 'New' },
    { id: '4', icon: '✓', label: 'Create a task tracker', badge: 'New' },
  ];

  // Page-specific capabilities
  const pageCapabilities = [
    { id: 'heading', icon: FiEdit, label: 'Add heading', action: () => handleAddBlock('heading_1') },
    { id: 'list', icon: FiList, label: 'Add bullet list', action: () => handleAddBlock('bulleted_list') },
    { id: 'todo', icon: FiCheckSquare, label: 'Add to-do', action: () => handleAddBlock('to_do') },
    { id: 'code', icon: FiCode, label: 'Add code block', action: () => handleAddBlock('code') },
    { id: 'analyze', icon: FiDatabase, label: 'Analyze page', action: handleAnalyzePage },
  ];

  // Debug logging
  // console.log('[GooseAgentCore] Rendering with messages:', messages.length, messages);

  return (
    <VStack align="stretch" spacing={0} flex="1" minH="0" position="relative">
      {/* Scrollable Content Area */}
      <Box flex="1" overflow="auto">
        <VStack spacing={2} p={mode === 'sidebar' ? 4 : 3} pb={2} align="flex-start">

          {/* Empty State - Show greeting and actions only when no messages */}
          {messages.length === 0 && (
            <>
              {/* Goose Avatar & Greeting */}
              <AnimatedGooseIcon
                state={isProcessing ? 'thinking' : 'idle'}
                size="48px"
                mb={2}
              />

              <Text fontSize="lg" fontWeight="bold">
                Quack! What's the plan?
              </Text>

              {/* Quick Actions - Only 2-3 most important */}
              <VStack align="stretch" spacing={0.5} width="100%" pt={2}>
                <HStack
                  px={2.5}
                  py={2}
                  borderRadius="6px"
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  transition="all 0.15s"
                  spacing={2.5}
                >
                  <Box
                    as="img"
                    src="/goose-icon.png"
                    alt="Goose"
                    w="20px"
                    h="20px"
                    filter={gooseFilter}
                  />
                  <Text flex={1} fontSize="sm" fontWeight="normal">
                    Personalize your Goose AI
                  </Text>
                  <Badge colorScheme="blue" fontSize="2xs" px={2} py={0.5} borderRadius="full">
                    New
                  </Badge>
                </HStack>

                <HStack
                  px={2.5}
                  py={2}
                  borderRadius="6px"
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  transition="all 0.15s"
                  spacing={2.5}
                >
                  <Text fontSize="lg" lineHeight="1">A文</Text>
                  <Text flex={1} fontSize="sm" fontWeight="normal">
                    Translate this page
                  </Text>
                </HStack>
              </VStack>
            </>
          )}

          {/* Chat Messages - Show once conversation starts */}
          {messages.length > 0 && (
            <VStack align="stretch" spacing={4} width="100%" pt={2}>
              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                    animation: 'fadeIn 0.3s ease forwards',
                    animationDelay: `${idx * 0.05}s`,
                    opacity: 0,
                  }}
                >
                  {/* Minimal message display like Notion */}
                  {msg.role === 'user' ? (
                    <Box
                      bg={userBubbleBg}
                      backdropFilter="blur(10px)"
                      borderRadius="xl"
                      px={4}
                      py={3}
                      ml="auto"
                      maxW="85%"
                      border="1px solid"
                      borderColor={userBubbleBorder}
                    >
                      <Text fontSize="sm" color={userMsgColor}>
                        {msg.content}
                      </Text>
                    </Box>
                  ) : (
                    <VStack align="stretch" spacing={2} maxW="95%">
                      <HStack spacing={2} align="center">
                        <AnimatedGooseIcon
                          size="20px"
                          state={msg.isStreaming ? 'thinking' : 'idle'}
                        />
                        <Text fontSize="xs" color={gooseNameColor} fontWeight="medium">
                          Goose
                        </Text>
                        {msg.recipeId && (() => {
                          const recipe = recipes.find(r => r.id === msg.recipeId);
                          return recipe ? (
                            <Badge
                              colorScheme="blue"
                              fontSize="2xs"
                              px={2}
                              py={0.5}
                              borderRadius="full"
                              fontWeight="medium"
                            >
                              {recipe.name}
                            </Badge>
                          ) : null;
                        })()}
                        {msg.isError && (
                          <Badge
                            colorScheme="red"
                            fontSize="2xs"
                            px={2}
                            py={0.5}
                            borderRadius="full"
                            fontWeight="medium"
                          >
                            Error
                          </Badge>
                        )}
                      </HStack>

                      {/* Parse think tags from content */}
                      {(() => {
                        const { cleanContent, thinkingText } = parseThinkTags(msg.content || '');
                        
                        // Merge extracted thinking with existing thinking data
                        const mergedThinking = msg.thinking || thinkingText ? {
                          ...msg.thinking,
                          reasoning: thinkingText || msg.thinking?.reasoning,
                        } : undefined;

                        return (
                          <>
                            {/* Thinking Accordion */}
                            {mergedThinking && (
                              <ThinkingAccordion
                                thinking={mergedThinking}
                                isThinking={msg.isStreaming}
                                isLast={idx === messages.length - 1}
                              />
                            )}

                            {/* Response Content with Markdown (cleaned of think tags) */}
                            {cleanContent && (
                              <Box
                                fontSize="sm"
                                color={msg.isError ? 'red.600' : assistantMsgColor}
                                lineHeight="1.7"
                                bg={msg.isError ? 'red.50' : 'transparent'}
                                borderLeft={msg.isError ? '3px solid' : 'none'}
                                borderColor={msg.isError ? 'red.500' : 'transparent'}
                                px={msg.isError ? 3 : 0}
                                py={msg.isError ? 2 : 0}
                                borderRadius={msg.isError ? 'md' : '0'}
                                sx={{
                                  '& p': { mb: 2, lineHeight: '1.6' },
                                  '& p:last-child': { mb: 0 },
                                  '& ul, & ol': { pl: 5, mb: 2 },
                                  '& li': { mb: 1.5, lineHeight: '1.6' },
                                  '& strong': { fontWeight: '600', color: strongColor },
                                  '& em': { fontStyle: 'italic' },
                                  '& code': {
                                    bg: codeBg,
                                    color: codeColor,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 'md',
                                    fontSize: '0.9em',
                                    fontFamily: 'monospace',
                                    border: '1px solid',
                                    borderColor: codeBorder,
                                  },
                                  '& pre': {
                                    bg: preBg,
                                    backdropFilter: 'blur(10px)',
                                    p: 4,
                                    borderRadius: 'lg',
                                    overflowX: 'auto',
                                    mb: 2,
                                    border: '1px solid',
                                    borderColor: preBorder,
                                  },
                                  '& pre code': {
                                    bg: 'transparent',
                                    border: 'none',
                                    p: 0,
                                  },
                                  '& h1, & h2, & h3': {
                                    fontWeight: '600',
                                    mb: 2,
                                    mt: 4,
                                    color: headingColor,
                                  },
                                  '& h1:first-child, & h2:first-child, & h3:first-child': { mt: 0 },
                                  '& h1': { fontSize: 'xl', letterSpacing: '-0.02em' },
                                  '& h2': { fontSize: 'lg', letterSpacing: '-0.01em' },
                                  '& h3': { fontSize: 'md' },
                                  '& blockquote': {
                                    borderLeft: '3px solid',
                                    borderColor: blockquoteBorder,
                                    pl: 4,
                                    py: 1,
                                    my: 2,
                                    fontStyle: 'italic',
                                    color: mutedColor,
                                  },
                                }}
                              >
                                <ReactMarkdown>{cleanContent}</ReactMarkdown>
                              </Box>
                            )}
                          </>
                        );
                      })()}

                      {/* Streaming indicator when no content yet */}
                      {msg.isStreaming && !msg.content && !msg.thinking && (
                        <HStack spacing={2} color={mutedColor}>
                          <Spinner size="xs" />
                          <Text fontSize="xs">Thinking...</Text>
                        </HStack>
                      )}
                    </VStack>
                  )}
                </Box>
              ))}

              {/* Auto-scroll anchor */}
              <Box ref={bottomRef} />
            </VStack>
          )}
        </VStack>
      </Box>

      {/* Fixed Input Area at Bottom */}
      <AIInputText
        agentId="page-agent"
        sessionId={sessionId}
        value={message}
        onChange={setMessage}
        onSubmit={handleSendMessage}
        isProcessing={isProcessing}
        isInitializing={isInitializing}
        pageTitle={pageTitle}
        mode={mode}
        activeRecipeId={activeRecipeId}
        onRecipeChange={setActiveRecipeId}
      />
    </VStack>
  );
});

GooseAgentCore.displayName = 'GooseAgentCore';
