/**
 * Goose Page Assistant - Sidebar Panel
 * Notion-style AI assistant for page editing
 * Slides in from right with quick actions and chat interface
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Button,
  Textarea,
  Divider,
  Badge,
  Tooltip,
  SimpleGrid,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMinimize2, FiEdit3, FiList, FiFileText, FiPlusCircle, FiHelpCircle, FiLayout } from 'react-icons/fi';
import { useAIContext } from '@/contexts/AIContextManager';
import { gooseClient, GooseSession } from '@/services/goose/GooseClient';
import { blockOperations } from '@/services/goose/BlockOperations';
import { BlockModel } from '@/lib/editor/BlockModel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GoosePageAssistantProps {
  onClose: () => void;
  pageId: string;
  pageTitle: string;
  blockModelRef?: React.RefObject<BlockModel | null>;
  onBlockAction?: (action: string, params?: any) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: FiEdit3,
    description: 'Improve selected text',
    color: 'purple',
  },
  {
    id: 'add-bullets',
    label: 'Add Bullets',
    icon: FiList,
    description: 'Add bullet points',
    color: 'blue',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: FiFileText,
    description: 'Create summary',
    color: 'green',
  },
  {
    id: 'continue',
    label: 'Continue',
    icon: FiPlusCircle,
    description: 'Continue writing',
    color: 'orange',
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: FiHelpCircle,
    description: 'Clarify section',
    color: 'cyan',
  },
  {
    id: 'format',
    label: 'Format',
    icon: FiLayout,
    description: 'Improve structure',
    color: 'pink',
  },
];

export const GoosePageAssistant: React.FC<GoosePageAssistantProps> = ({
  onClose,
  pageId,
  pageTitle,
  blockModelRef,
  onBlockAction,
}) => {
  const { context } = useAIContext();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState<GooseSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Set BlockModel in blockOperations when available
  useEffect(() => {
    if (blockModelRef?.current) {
      blockOperations.setBlockModel(blockModelRef.current);
      console.log('[GoosePageAssistant] ✅ BlockModel set in operations service');
    }
  }, [blockModelRef]);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const actionBg = useSemanticToken('surface.base');
  const actionHoverBg = useSemanticToken('surface.hover');

  // Initialize Goose session
  useEffect(() => {
    const initSession = async () => {
      try {
        setIsInitializing(true);
        const pageContext = context as any;
        
        const newSession = await gooseClient.createSession(pageId, {
          pageTitle,
          blockCount: pageContext?.page?.blockCount || 0,
          workspaceId: pageContext?.workspace?.id || '',
        });

        setSession(newSession);
        console.log('[GoosePageAssistant] ✅ Session created:', newSession.id);
      } catch (error) {
        console.error('[GoosePageAssistant] Failed to create session:', error);
        toast({
          title: 'Failed to initialize Goose',
          description: 'Using offline mode',
          status: 'warning',
          duration: 3000,
        });
      } finally {
        setIsInitializing(false);
        textareaRef.current?.focus();
      }
    };

    initSession();
  }, [pageId, pageTitle, context, toast]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = async (actionId: string) => {
    if (!session) {
      toast({
        title: 'Session not ready',
        description: 'Please wait for Goose to initialize',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    const action = quickActions.find(a => a.id === actionId);
    if (!action) return;

    console.log('[GoosePageAssistant] Quick action:', actionId);
    
    // Add user message
    const userMessage = `${action.label}: ${action.description}`;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      // Call Goose API
      const response = await gooseClient.executeQuickAction(session.id, actionId);

      if (response.success && response.message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.message.content,
        }]);
        
        // Tool execution is handled by Goose API - no hardcoded operations needed
      } else {
        throw new Error(response.error || 'Failed to execute action');
      }

      // Call block action if provided
      if (onBlockAction) {
        onBlockAction(actionId);
      }
    } catch (error) {
      console.error('[GoosePageAssistant] Error executing action:', error);
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsProcessing(false);
    }
  };

  // Tool execution is now handled by Goose API with proper MCP tool calls
  // No hardcoded fake content operations needed

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;
    
    if (!session) {
      toast({
        title: 'Session not ready',
        description: 'Please wait for Goose to initialize',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    const userMessage = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    console.log('[GoosePageAssistant] Sending message:', userMessage);

    try {
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

      // Call Goose API
      const response = await gooseClient.sendMessage({
        sessionId: session.id,
        message: userMessage,
        context: pageContext,
      });

      if (response.success && response.message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.message.content,
        }]);
        
        // Tool execution is handled by Goose API - no manual parsing needed
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('[GoosePageAssistant] Error sending message:', error);
      toast({
        title: 'Message failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
      setMessage(userMessage); // Restore message in input
    } finally {
      setIsProcessing(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: '400px',
          height: '100vh',
          zIndex: 999,
        }}
      >
        <Box
          bg={bgColor}
          borderLeft="1px solid"
          borderColor={borderColor}
          h="100vh"
          display="flex"
          flexDirection="column"
          boxShadow="lg"
        >
          {/* Header */}
          <HStack
            p={4}
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={borderColor}
            justify="space-between"
          >
            <HStack spacing={2}>
              <Text fontSize="2xl">🦢</Text>
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" fontSize="sm">
                  Goose Assistant
                </Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} isTruncated maxW="250px">
                  {pageTitle}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={1}>
              <Tooltip label="Minimize to floating">
                <IconButton
                  aria-label="Minimize"
                  icon={<FiMinimize2 />}
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                />
              </Tooltip>
              <Tooltip label="Close">
                <IconButton
                  aria-label="Close"
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Context Badge */}
          {context && context.type === 'workspace-page' && (
            <HStack p={2} bg={actionBg} spacing={2} fontSize="xs">
              <Badge colorScheme="green" fontSize="xs">
                Page Context Active
              </Badge>
              <Text color={useSemanticToken('text.secondary')}>
                {(context as any).page?.blockCount || 0} blocks
              </Text>
            </HStack>
          )}

          {/* Quick Actions */}
          <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
            <Text fontSize="xs" fontWeight="semibold" mb={2} color={useSemanticToken('text.secondary')}>
              QUICK ACTIONS
            </Text>
            <SimpleGrid columns={2} spacing={2}>
              {quickActions.map(action => (
                <Button
                  key={action.id}
                  size="sm"
                  leftIcon={<action.icon />}
                  variant="outline"
                  bg={actionBg}
                  _hover={{ bg: actionHoverBg }}
                  onClick={() => handleQuickAction(action.id)}
                  isDisabled={isProcessing || isInitializing}
                  justifyContent="flex-start"
                  fontWeight="normal"
                >
                  {action.label}
                </Button>
              ))}
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Messages */}
          <VStack
            flex={1}
            overflowY="auto"
            p={4}
            spacing={3}
            align="stretch"
          >
            {isInitializing ? (
              <VStack spacing={3} py={8} color={useSemanticToken('text.secondary')}>
                <Spinner size="lg" color="blue.500" />
                <Text fontSize="sm" textAlign="center">
                  Initializing Goose...
                </Text>
              </VStack>
            ) : messages.length === 0 ? (
              <VStack spacing={2} py={8} color={useSemanticToken('text.secondary')}>
                <Text fontSize="2xl">💬</Text>
                <Text fontSize="sm" textAlign="center">
                  Ask me to help edit this page!
                </Text>
                <Text fontSize="xs" textAlign="center" color={useSemanticToken('text.tertiary')}>
                  Try "Add 3 bullet points" or "Rewrite this paragraph"
                </Text>
              </VStack>
            ) : (
              messages.map((msg, idx) => (
                <Box
                  key={idx}
                  alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="85%"
                >
                  <Box
                    bg={msg.role === 'user' ? 'blue.500' : actionBg}
                    color={msg.role === 'user' ? 'white' : 'inherit'}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    fontSize="sm"
                  >
                    {msg.content}
                  </Box>
                </Box>
              ))
            )}
            {isProcessing && (
              <HStack spacing={2} color={useSemanticToken('text.secondary')}>
                <Spinner size="sm" />
                <Text fontSize="sm">Goose is thinking...</Text>
              </HStack>
            )}
            <div ref={messagesEndRef} />
          </VStack>

          {/* Input */}
          <Box
            p={4}
            borderTop="1px solid"
            borderColor={borderColor}
            bg={headerBg}
          >
            <VStack spacing={2}>
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isInitializing ? "Initializing..." : "Ask Goose to edit this page..."}
                size="sm"
                resize="none"
                rows={3}
                isDisabled={isProcessing || isInitializing}
              />
              <HStack w="100%" justify="space-between">
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {isInitializing ? 'Setting up Goose...' : 'Press Enter to send, Shift+Enter for new line'}
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleSendMessage}
                  isDisabled={!message.trim() || isProcessing || isInitializing}
                  isLoading={isProcessing}
                >
                  Send
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

export default GoosePageAssistant;
