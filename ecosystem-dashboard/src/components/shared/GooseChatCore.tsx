/**
 * GooseChatCore - Unified Chat Component for all Goose UIs
 * 
 * A modular chat component that adapts based on enabled features.
 * Used by: GooseMind, PageAgent, WorkspaceAI, AgenticControl
 * 
 * Features are controlled via useGooseFeatures hook and presets.
 */

import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  VStack,
  HStack,
  Box,
  IconButton,
  Spinner,
  Text,
  Badge,
  Tooltip,
  Collapse,
} from '@chakra-ui/react';
import { FiSend, FiMic, FiMicOff, FiVolume2, FiPaperclip, FiSettings } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useGooseFeatures, UseGooseFeaturesOptions } from '@/hooks/useGooseFeatures';
import { useGooseMessaging, GooseMessage } from '@/hooks/useGooseMessaging';
import { ChatTextarea } from '@/components/shared/ChatTextarea';
import { AnimatedGooseIcon } from '@/components/shared/AnimatedGooseIcon';
import { ThinkingAccordion } from '@/components/workspace/ThinkingAccordion';
import { GooseFeatureId } from '@/lib/goose/features';

export interface GooseChatCoreProps extends UseGooseFeaturesOptions {
  agentId: string;
  sessionId?: string;
  context?: any;
  onPageUpdate?: () => void;
  onStreamingChunk?: (chunk: string) => void;
  
  // UI customization
  placeholder?: string;
  showHeader?: boolean;
  headerTitle?: string;
  compact?: boolean;
  maxHeight?: string;
  
  // Voice callbacks (for GooseMind voice panel)
  onVoiceTranscript?: (text: string) => void;
  onVoiceResponse?: (text: string) => void;
}

export interface GooseChatCoreRef {
  clearMessages: () => void;
  sendMessage: (text: string) => void;
  getMessages: () => GooseMessage[];
}

export const GooseChatCore = forwardRef<GooseChatCoreRef, GooseChatCoreProps>(({
  agentId,
  sessionId,
  preset,
  enable,
  disable,
  backendUrl,
  model,
  context,
  onPageUpdate,
  onStreamingChunk,
  placeholder = 'Type a message...',
  showHeader = false,
  headerTitle,
  compact = false,
  maxHeight = '100%',
  onVoiceTranscript,
  onVoiceResponse,
  checkAvailability = false,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  
  // Feature configuration
  const features = useGooseFeatures({
    preset,
    enable,
    disable,
    backendUrl,
    model,
    checkAvailability,
  });
  
  // Messaging hook
  const {
    messages,
    isProcessing,
    sendMessage: sendGooseMessage,
    clearMessages,
  } = useGooseMessaging({
    agentId,
    sessionId,
    model: features.config.model,
    context,
    onPageUpdate,
    onStreamingChunk,
  });
  
  // Track streaming state from messages
  const isStreaming = messages.some(m => m.isStreaming);
  const error = null; // Error handling can be added later
  
  // Voice state (only if voice features enabled)
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Semantic tokens
  const bgSubtle = useSemanticToken('surface.subtle');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearMessages,
    sendMessage: (text: string) => handleSend(text),
    getMessages: () => messages,
  }), [messages, clearMessages]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send message handler
  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || message.trim();
    if (!messageText) return;
    
    setMessage('');
    await sendGooseMessage(messageText);
  }, [message, sendGooseMessage]);
  
  // Voice recording (only if feature enabled)
  const handleVoiceToggle = useCallback(async () => {
    if (!features.has('voice-input')) return;
    
    if (isRecording) {
      setIsRecording(false);
      // Stop recording logic would go here
    } else {
      setIsRecording(true);
      // Start recording logic would go here
    }
  }, [features, isRecording]);
  
  // Keyboard handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  return (
    <VStack
      h={maxHeight}
      w="100%"
      spacing={0}
      bg={bgSubtle}
      borderRadius={compact ? 'md' : 'lg'}
      overflow="hidden"
    >
      {/* Optional Header */}
      {showHeader && (
        <HStack
          w="100%"
          p={compact ? 2 : 3}
          borderBottom="1px"
          borderColor={borderColor}
          justify="space-between"
        >
          <HStack>
            <AnimatedGooseIcon state={isProcessing || isStreaming ? 'thinking' : 'idle'} size={compact ? 20 : 24} />
            <Text fontWeight="medium" fontSize={compact ? 'sm' : 'md'}>
              {headerTitle || preset}
            </Text>
          </HStack>
          <HStack spacing={1}>
            {features.hasVoice && (
              <Badge colorScheme="purple" size="sm">Voice</Badge>
            )}
            {features.hasTools && (
              <Badge colorScheme="blue" size="sm">Tools</Badge>
            )}
          </HStack>
        </HStack>
      )}
      
      {/* Messages Area */}
      <VStack
        flex={1}
        w="100%"
        overflowY="auto"
        p={compact ? 2 : 4}
        spacing={compact ? 2 : 3}
        align="stretch"
      >
        {messages.length === 0 && (
          <Box textAlign="center" py={compact ? 4 : 8} color={textSecondary}>
            <AnimatedGooseIcon state="idle" size={compact ? 32 : 48} />
            <Text mt={2} fontSize={compact ? 'sm' : 'md'}>
              Start a conversation
            </Text>
          </Box>
        )}
        
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            compact={compact}
            showThinking={features.has('thinking-display')}
          />
        ))}
        
        {/* Loading indicator */}
        {isProcessing && !isStreaming && (
          <HStack justify="flex-start" px={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color={textSecondary}>Thinking...</Text>
          </HStack>
        )}
        
        {/* Error display */}
        {error && (
          <Box p={2} bg="red.50" borderRadius="md" color="red.600">
            <Text fontSize="sm">{error}</Text>
          </Box>
        )}
        
        <div ref={bottomRef} />
      </VStack>
      
      {/* Input Area */}
      <HStack
        w="100%"
        p={compact ? 2 : 3}
        borderTop="1px"
        borderColor={borderColor}
        spacing={2}
      >
        {/* File attachment (if enabled) */}
        {features.has('file-attachments') && (
          <Tooltip label="Attach file">
            <IconButton
              aria-label="Attach file"
              icon={<FiPaperclip />}
              size={compact ? 'sm' : 'md'}
              variant="ghost"
            />
          </Tooltip>
        )}
        
        {/* Voice input (if enabled) */}
        {features.has('voice-input') && (
          <Tooltip label={isRecording ? 'Stop recording' : 'Voice input'}>
            <IconButton
              aria-label="Voice input"
              icon={isRecording ? <FiMicOff /> : <FiMic />}
              size={compact ? 'sm' : 'md'}
              variant={isRecording ? 'solid' : 'ghost'}
              colorScheme={isRecording ? 'red' : 'gray'}
              onClick={handleVoiceToggle}
            />
          </Tooltip>
        )}
        
        {/* Text input */}
        <ChatTextarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          size={compact ? 'sm' : 'md'}
          minH={compact ? '32px' : '40px'}
          maxH="120px"
          flex={1}
          isDisabled={isProcessing}
        />
        
        {/* Send button */}
        <IconButton
          aria-label="Send message"
          icon={<FiSend />}
          size={compact ? 'sm' : 'md'}
          colorScheme="blue"
          onClick={() => handleSend()}
          isLoading={isProcessing}
          isDisabled={!message.trim()}
        />
      </HStack>
    </VStack>
  );
});

GooseChatCore.displayName = 'GooseChatCore';

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: GooseMessage;
  compact?: boolean;
  showThinking?: boolean;
}

function MessageBubble({ message, compact, showThinking }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const textPrimary = useSemanticToken('text.primary');
  
  return (
    <VStack
      align={isUser ? 'flex-end' : 'flex-start'}
      w="100%"
      spacing={1}
    >
      {/* Thinking accordion (for assistant messages with thinking data) */}
      {!isUser && showThinking && message.thinking && (
        <Box w="100%" maxW="85%">
          <ThinkingAccordion thinking={message.thinking} />
        </Box>
      )}
      
      {/* Message content */}
      <Box
        maxW="85%"
        bg={isUser ? 'blue.500' : 'gray.100'}
        color={isUser ? 'white' : textPrimary}
        px={compact ? 2 : 3}
        py={compact ? 1 : 2}
        borderRadius="lg"
        fontSize={compact ? 'sm' : 'md'}
      >
        {isUser ? (
          <Text>{message.content}</Text>
        ) : (
          <Box className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </Box>
        )}
      </Box>
      
      {/* Streaming indicator */}
      {message.isStreaming && (
        <HStack spacing={1} px={2}>
          <Spinner size="xs" />
          <Text fontSize="xs" color="gray.500">Streaming...</Text>
        </HStack>
      )}
    </VStack>
  );
}

export default GooseChatCore;
