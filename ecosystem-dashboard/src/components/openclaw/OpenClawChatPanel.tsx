/**
 * OpenClaw Chat Panel
 * 
 * Native chat interface for OpenClaw Gateway.
 * Implements chat.send, chat.history, chat.abort via WebSocket RPC.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { FiSend, FiStopCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface OpenClawChatPanelProps {
  connected: boolean;
  chatHistory: ChatMessage[];
  onSend: (message: string) => Promise<void>;
  onAbort: () => Promise<void>;
  onLoadHistory: () => Promise<void>;
}

export function OpenClawChatPanel({
  connected,
  chatHistory,
  onSend,
  onAbort,
  onLoadHistory,
}: OpenClawChatPanelProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    if (connected) {
      onLoadHistory();
    }
  }, [connected, onLoadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || !connected || sending) return;

    const message = input.trim();
    setInput('');
    setSending(true);

    try {
      await onSend(message);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      h="400px"
      display="flex"
      flexDirection="column"
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
      overflow="hidden"
    >
      <HStack p={3} borderBottom="1px solid" borderColor={borderSubtle}>
        <Text fontWeight="600" color={textPrimary} fontSize="sm">
          Chat
        </Text>
        <Badge colorScheme={connected ? 'green' : 'red'} fontSize="xs">
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </HStack>

      <Box flex={1} overflowY="auto" p={3}>
        <VStack align="stretch" spacing={2}>
          {chatHistory.length === 0 ? (
            <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>
              No messages yet. Start a conversation with OpenClaw.
            </Text>
          ) : (
            chatHistory.map((msg, idx) => (
              <Box
                key={idx}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
                p={2}
                borderRadius="md"
                bg={msg.role === 'user' ? 'blue.500' : bgElevated}
                border={msg.role !== 'user' ? '1px solid' : 'none'}
                borderColor={borderSubtle}
              >
                <Text
                  fontSize="sm"
                  color={msg.role === 'user' ? 'white' : textPrimary}
                  whiteSpace="pre-wrap"
                >
                  {msg.content}
                </Text>
                {msg.timestamp && (
                  <Text
                    fontSize="xs"
                    color={msg.role === 'user' ? 'whiteAlpha.700' : textSecondary}
                    mt={1}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      <HStack p={3} borderTop="1px solid" borderColor={borderSubtle}>
        <Input
          placeholder={connected ? 'Type a message...' : 'Connect to chat'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          isDisabled={!connected || sending}
          size="sm"
          bg={bgElevated}
        />
        {sending ? (
          <IconButton
            aria-label="Stop"
            icon={<FiStopCircle />}
            colorScheme="red"
            size="sm"
            onClick={onAbort}
          />
        ) : (
          <IconButton
            aria-label="Send"
            icon={sending ? <Spinner size="sm" /> : <FiSend />}
            colorScheme="blue"
            size="sm"
            onClick={handleSend}
            isDisabled={!connected || !input.trim()}
          />
        )}
      </HStack>
    </Box>
  );
}

export default OpenClawChatPanel;
