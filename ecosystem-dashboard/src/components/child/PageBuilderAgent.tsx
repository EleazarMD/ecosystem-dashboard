/**
 * Conversational Page Builder Agent Component
 * 
 * An improved AI agent UI that:
 * 1. Asks clarifying questions to understand what the child wants
 * 2. Provides clickable options for easy selection
 * 3. Shows a preview before creating the page
 * 4. Integrates with Kids PIC system
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Divider,
  Spinner,
  useToast,
  Wrap,
  WrapItem,
  Collapse,
} from '@chakra-ui/react';
import { FiSend, FiRefreshCw, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';

// ============================================================================
// Types
// ============================================================================

interface ClickableOption {
  id: string;
  label: string;
  emoji: string;
  value: string;
  description?: string;
}

interface PagePreview {
  title: string;
  icon: string;
  blocks: PageBlock[];
}

interface RichTextItem {
  text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

interface PageBlock {
  type: string;
  content: string | RichTextItem[];
  properties?: Record<string, any>;
  children?: PageBlock[];
}

// Convert API PageBlock to workspace-compatible format
function convertBlockContent(content: string | RichTextItem[]): RichTextItem[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') {
        return { text: item };
      }
      return { text: item.text || '', annotations: item.annotations };
    });
  }
  return [{ text: '' }];
}

// Convert API blocks to workspace ChildBlock format
function convertToChildBlocks(blocks: PageBlock[], workspaceId: string = 'temp'): any[] {
  return blocks.map((block, index) => ({
    id: `temp-${Date.now()}-${index}`,
    workspaceId,
    type: block.type || 'paragraph',
    content: convertBlockContent(block.content),
    properties: block.properties || {},
    parentId: null,
    position: index,
    children: block.children ? convertToChildBlocks(block.children, workspaceId) : [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'ai-agent',
    lastEditedBy: 'ai-agent',
    archived: false,
    isTemplate: false,
    sharedWithParent: false,
  }));
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  options?: ClickableOption[];
  pagePreview?: PagePreview;
}

interface AgentState {
  stage: 'initial' | 'clarifying' | 'refining' | 'ready';
  pageType?: string;
  title?: string;
  details: Record<string, any>;
  conversationHistory: ConversationMessage[];
}

interface PageBuilderAgentProps {
  onPageCreate: (page: PagePreview) => void;
  isMinecraft?: boolean;
  isPusheen?: boolean;
  primaryColor?: string;
  // Current page context for AI agent awareness
  currentPageId?: string | null;
  currentPageTitle?: string;
  currentPageIcon?: string;
  currentPageBlocks?: PageBlock[];
  onPageUpdate?: (blocks: PageBlock[], title?: string, icon?: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PageBuilderAgent({
  onPageCreate,
  isMinecraft = false,
  isPusheen = false,
  primaryColor = 'purple.500',
  // Current page context
  currentPageId = null,
  currentPageTitle = '',
  currentPageIcon = '📄',
  currentPageBlocks = [],
  onPageUpdate,
}: PageBuilderAgentProps) {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to always have the latest onPageUpdate callback
  const onPageUpdateRef = useRef(onPageUpdate);
  useEffect(() => {
    onPageUpdateRef.current = onPageUpdate;
  }, [onPageUpdate]);
  
  const [state, setState] = useState<AgentState | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Track if we're in "redesign mode" (editing existing page vs creating new)
  const isEditingExistingPage = !!currentPageId;
  

  // Start conversation on mount or when page context changes
  useEffect(() => {
    startConversation();
  }, [currentPageId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/child/workspace/page-builder-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start',
          // Pass current page context for redesign awareness
          currentPage: currentPageId ? {
            id: currentPageId,
            title: currentPageTitle,
            icon: currentPageIcon,
            blocks: currentPageBlocks,
          } : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setMessages(data.state.conversationHistory);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Fallback greeting - context-aware
      const fallbackOptions = currentPageId ? [
        { id: 'redesign', label: 'Redesign Page', emoji: '✨', value: 'redesign', description: 'Improve structure' },
        { id: 'add-sections', label: 'Add Sections', emoji: '📑', value: 'add-sections', description: 'Add headings & content' },
        { id: 'new-page', label: 'New Page', emoji: '📄', value: 'new-page', description: 'Create something new' },
      ] : [
        { id: 'story', label: 'Story', emoji: '📖', value: 'story' },
        { id: 'list', label: 'List', emoji: '📋', value: 'list' },
        { id: 'trip', label: 'Trip', emoji: '✈️', value: 'trip' },
        { id: 'project', label: 'Project', emoji: '🔬', value: 'project' },
        { id: 'homework', label: 'Homework', emoji: '📚', value: 'homework' },
        { id: 'goals', label: 'Goals', emoji: '🎯', value: 'goals' },
      ];
      
      const fallbackContent = currentPageId 
        ? `Hi! 👋 I see you're working on "${currentPageTitle || 'this page'}". How can I help?`
        : 'Hi! 👋 What would you like to create today?';
      
      setMessages([{
        role: 'assistant',
        content: fallbackContent,
        options: fallbackOptions,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/child/workspace/page-builder-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          message: userMessage,
          state,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        setMessages(data.state.conversationHistory);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Oops! Something went wrong. Try again? 😊',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const selectOption = async (option: ClickableOption) => {
    if (loading) return;

    // Handle create action
    if (option.value === 'create' && state) {
      setLoading(true);
      try {
        const res = await fetch('/api/child/workspace/page-builder-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate',
            state,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.page) {
            onPageCreate(data.page);
            toast({
              title: 'Page created! 🎉',
              description: data.page.title,
              status: 'success',
              duration: 2000,
            });
            // Reset for next page
            startConversation();
          }
        }
      } catch (error) {
        console.error('Failed to create page:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Add selection to UI
    setMessages(prev => [...prev, { role: 'user', content: `${option.emoji} ${option.label}` }]);
    
    console.log('[PageBuilderAgent] selectOption called:', { 
      optionId: option.id, 
      hasCurrentPage: !!currentPageId,
      currentPageTitle,
      blocksCount: currentPageBlocks?.length 
    });
    
    setLoading(true);

    try {
      const res = await fetch('/api/child/workspace/page-builder-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          selectedOption: option,
          state,
          // Pass current page context for redesign operations
          currentPage: currentPageId ? {
            id: currentPageId,
            title: currentPageTitle,
            icon: currentPageIcon,
            blocks: currentPageBlocks,
          } : null,
        }),
      });
      
      console.log('[PageBuilderAgent] API response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          setMessages(data.state.conversationHistory);
        } else if (data.success && data.action === 'redesign' && data.page) {
          // Page was redesigned - update existing page
          console.log('[PageBuilderAgent] Redesign success:', { 
            hasBlocks: !!data.page.blocks, 
            blockCount: data.page.blocks?.length,
            title: data.page.title,
            icon: data.page.icon
          });
          
          // Use ref to get the latest callback (avoids stale closure)
          const latestOnPageUpdate = onPageUpdateRef.current;
          console.log('[PageBuilderAgent] onPageUpdate available:', !!latestOnPageUpdate);
          
          if (latestOnPageUpdate && data.page.blocks) {
            // Convert API blocks to workspace ChildBlock format
            const childBlocks = convertToChildBlocks(data.page.blocks);
            console.log('[PageBuilderAgent] Calling onPageUpdate with:', {
              blockCount: childBlocks.length,
              title: data.page.title,
              icon: data.page.icon
            });
            
            // Pass blocks, title, and icon to the update callback
            latestOnPageUpdate(childBlocks, data.page.title, data.page.icon);
            toast({
              title: 'Page redesigned! ✨',
              description: data.page.title,
              status: 'success',
              duration: 2000,
            });
            // Show the result in chat
            setMessages(prev => [...prev, data.message]);
          } else if (data.page.blocks) {
            console.warn('[PageBuilderAgent] onPageUpdate not available');
            // Still show the result in chat even if we can't update the page
            setMessages(prev => [...prev, data.message]);
            toast({
              title: 'Page redesigned! ✨',
              description: 'Please refresh to see changes',
              status: 'warning',
              duration: 3000,
            });
          }
        } else if (data.success && data.page) {
          // New page was created
          onPageCreate(data.page);
          toast({
            title: 'Page created! 🎉',
            description: data.page.title,
            status: 'success',
            duration: 2000,
          });
          startConversation();
        }
      }
    } catch (error) {
      console.error('Failed to select option:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderMessage = (message: ConversationMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <Box
        key={index}
        alignSelf={isUser ? 'flex-end' : 'flex-start'}
        maxW="90%"
      >
        <Box
          bg={isUser ? primaryColor : 'gray.100'}
          color={isUser ? 'white' : 'gray.800'}
          px={3}
          py={2}
          borderRadius={isMinecraft ? '4px' : 'lg'}
          fontSize="sm"
        >
          <Text whiteSpace="pre-wrap">{message.content}</Text>
        </Box>

        {/* Clickable Options */}
        {message.options && message.options.length > 0 && (
          <Wrap mt={2} spacing={2}>
            {message.options.map((option) => (
              <WrapItem key={option.id}>
                <Button
                  size="sm"
                  variant="outline"
                  borderRadius={isMinecraft ? '4px' : 'full'}
                  onClick={() => selectOption(option)}
                  isDisabled={loading}
                  _hover={{ 
                    bg: option.value === 'create' ? 'green.50' : 'purple.50',
                    borderColor: option.value === 'create' ? 'green.400' : 'purple.400',
                  }}
                  borderColor={option.value === 'create' ? 'green.400' : undefined}
                  colorScheme={option.value === 'create' ? 'green' : undefined}
                >
                  <HStack spacing={1}>
                    <Text>{option.emoji}</Text>
                    <Text fontSize="xs">{option.label}</Text>
                  </HStack>
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        )}

        {/* Page Preview */}
        {message.pagePreview && (
          <Box
            mt={2}
            p={3}
            bg="white"
            border="1px solid"
            borderColor="green.200"
            borderRadius={isMinecraft ? '4px' : 'lg'}
          >
            <HStack 
              justify="space-between" 
              cursor="pointer"
              onClick={() => setShowPreview(!showPreview)}
            >
              <HStack>
                <Text fontSize="lg">{message.pagePreview.icon}</Text>
                <Text fontWeight="bold" fontSize="sm">{message.pagePreview.title}</Text>
              </HStack>
              <IconButton
                aria-label="Toggle preview"
                icon={showPreview ? <FiChevronUp /> : <FiChevronDown />}
                size="xs"
                variant="ghost"
              />
            </HStack>
            
            <Collapse in={showPreview}>
              <Divider my={2} />
              <VStack align="stretch" spacing={1} maxH="120px" overflowY="auto">
                {message.pagePreview.blocks.slice(0, 8).map((block, idx) => (
                  <HStack key={idx} fontSize="xs" color="gray.600">
                    <Text>
                      {block.type === 'heading_1' ? '📌' :
                       block.type === 'heading_2' ? '📎' :
                       block.type === 'paragraph' ? '📝' :
                       block.type === 'bulleted_list' ? '•' :
                       block.type === 'numbered_list' ? '1.' :
                       block.type === 'to_do' ? '☑️' :
                       block.type === 'callout' ? '💡' :
                       block.type === 'divider' ? '—' : '📄'}
                    </Text>
                    <Text noOfLines={1} flex={1}>
                      {typeof block.content === 'string' 
                        ? block.content 
                        : Array.isArray(block.content) 
                          ? block.content.map(c => c.text).join('') 
                          : '(divider)'}
                    </Text>
                  </HStack>
                ))}
                {message.pagePreview.blocks.length > 8 && (
                  <Text fontSize="xs" color="gray.400">
                    +{message.pagePreview.blocks.length - 8} more...
                  </Text>
                )}
              </VStack>
            </Collapse>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <VStack h="full" spacing={0}>
      {/* Header */}
      <HStack w="full" p={2} borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="lg">🤖</Text>
        <Box flex={1}>
          <Text fontWeight="bold" fontSize="sm">Page Builder Agent</Text>
          <Text fontSize="xs" color="gray.500">I'll help structure your page!</Text>
        </Box>
        <IconButton
          aria-label="Start over"
          icon={<FiRefreshCw />}
          size="xs"
          variant="ghost"
          onClick={startConversation}
          isDisabled={loading}
        />
      </HStack>

      {/* Messages */}
      <VStack
        flex={1}
        w="full"
        p={2}
        spacing={3}
        overflowY="auto"
        align="stretch"
      >
        {messages.map((msg, idx) => renderMessage(msg, idx))}
        
        {loading && (
          <HStack alignSelf="flex-start">
            <Spinner size="sm" color={primaryColor} />
            <Text fontSize="xs" color="gray.500">Thinking...</Text>
          </HStack>
        )}
        
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input */}
      <HStack w="full" p={2} borderTop="1px solid" borderColor="gray.200">
        <Input
          size="sm"
          placeholder="Type your answer..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          isDisabled={loading}
          borderRadius={isMinecraft ? '4px' : 'full'}
        />
        <IconButton
          aria-label="Send"
          icon={<FiSend />}
          size="sm"
          colorScheme="purple"
          onClick={sendMessage}
          isDisabled={!inputValue.trim() || loading}
          borderRadius={isMinecraft ? '4px' : 'full'}
        />
      </HStack>
    </VStack>
  );
}

export default PageBuilderAgent;
