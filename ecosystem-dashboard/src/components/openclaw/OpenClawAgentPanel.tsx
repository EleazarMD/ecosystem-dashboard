/**
 * OpenClaw Agent Panel
 * 
 * Embeddable OpenClaw agent chat for integration with Agentic Workflows
 * or as an agent option in GooseMind.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Spinner,
  Badge,
  Select,
} from '@chakra-ui/react';
import { FiSend, FiStopCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useOpenClawWebSocket } from '@/hooks/useOpenClawWebSocket';

interface OpenClawAgentPanelProps {
  compact?: boolean;
  sessionKey?: string;
  onSessionChange?: (sessionKey: string) => void;
}

export function OpenClawAgentPanel({
  compact = false,
  sessionKey,
  onSessionChange,
}: OpenClawAgentPanelProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [state, actions] = useOpenClawWebSocket();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    actions.connect();
    return () => {
      actions.disconnect();
    };
  }, []);

  useEffect(() => {
    if (state.connected) {
      actions.chatHistory(sessionKey);
    }
  }, [state.connected, sessionKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !state.connected || sending) return;

    const message = input.trim();
    setInput('');
    setSending(true);

    try {
      await actions.chatSend(message, sessionKey);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [input, state.connected, sending, sessionKey, actions]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = useCallback(async () => {
    try {
      await actions.chatAbort(sessionKey);
    } catch (err) {
      console.error('Failed to abort:', err);
    }
  }, [sessionKey, actions]);

  return (
    <Box
      h={compact ? '300px' : '400px'}
      display="flex"
      flexDirection="column"
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
      overflow="hidden"
    >
      <HStack p={2} borderBottom="1px solid" borderColor={borderSubtle} justify="space-between">
        <HStack>
          <Text fontWeight="600" color={textPrimary} fontSize="sm">
            OpenClaw Agent
          </Text>
          <Badge colorScheme={state.connected ? 'green' : 'red'} fontSize="xs">
            {state.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </HStack>
        {state.sessions.length > 0 && onSessionChange && (
          <Select
            size="xs"
            w="150px"
            value={sessionKey || ''}
            onChange={(e) => onSessionChange(e.target.value)}
          >
            <option value="">Default Session</option>
            {state.sessions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.agentId} - {s.key.slice(0, 8)}...
              </option>
            ))}
          </Select>
        )}
      </HStack>

      <Box flex={1} overflowY="auto" p={2}>
        <VStack align="stretch" spacing={2}>
          {state.chatHistory.length === 0 ? (
            <Text color={textSecondary} fontSize="xs" textAlign="center" py={4}>
              Chat with OpenClaw agent
            </Text>
          ) : (
            state.chatHistory.map((msg, idx) => (
              <Box
                key={idx}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="85%"
                p={2}
                borderRadius="md"
                bg={msg.role === 'user' ? 'blue.500' : bgElevated}
                border={msg.role !== 'user' ? '1px solid' : 'none'}
                borderColor={borderSubtle}
              >
                <Text
                  fontSize="xs"
                  color={msg.role === 'user' ? 'white' : textPrimary}
                  whiteSpace="pre-wrap"
                >
                  {msg.content}
                </Text>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      <HStack p={2} borderTop="1px solid" borderColor={borderSubtle}>
        <Input
          placeholder={state.connected ? 'Message...' : 'Connecting...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          isDisabled={!state.connected || sending}
          size="sm"
          bg={bgElevated}
        />
        {sending ? (
          <IconButton
            aria-label="Stop"
            icon={<FiStopCircle />}
            colorScheme="red"
            size="sm"
            onClick={handleAbort}
          />
        ) : (
          <IconButton
            aria-label="Send"
            icon={sending ? <Spinner size="sm" /> : <FiSend />}
            colorScheme="blue"
            size="sm"
            onClick={handleSend}
            isDisabled={!state.connected || !input.trim()}
          />
        )}
      </HStack>
    </Box>
  );
}

export default OpenClawAgentPanel;
