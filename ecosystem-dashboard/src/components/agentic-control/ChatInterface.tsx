import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Flex,
  IconButton,
  Avatar,
  Badge,
  Textarea,
  Spinner,
  Tooltip,
} from '@chakra-ui/react';
import { FiSend, FiTrash2, FiSettings, FiMessageSquare, FiMonitor } from 'react-icons/fi';
import { Agent } from '../../hooks/useAgentManagement';
import { ChatMessage } from '../../hooks/useAgentMessaging';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChatInterfaceProps {
  selectedAgent: Agent | null;
  messages: ChatMessage[];
  currentMessage: string;
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onClearConversation: () => void;
  getStatusColor: (status: Agent['status']) => string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedAgent,
  messages,
  currentMessage,
  isTyping,
  messagesEndRef,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onClearConversation,
  getStatusColor,
}) => {
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const sidebarBg = useSemanticToken('surface.base');
  const inputBg = useSemanticToken('surface.elevated');

  if (!selectedAgent) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" h="full">
        <VStack spacing={4}>
          <FiMonitor size={64} color="gray" />
          <Text fontSize="xl" color={useSemanticToken('text.secondary')}>Select an AI Agent</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack h="full" spacing={0}>
      {/* Header */}
      <HStack p={4} borderBottom="1px" borderColor={borderColor} bg={sidebarBg} w="full">
        <Avatar size="sm" name={selectedAgent.name} />
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="bold">{selectedAgent.name}</Text>
          <Badge size="sm" colorScheme={getStatusColor(selectedAgent.status)}>
            {selectedAgent.status}
          </Badge>
        </VStack>
        <Tooltip label="Clear conversation">
          <IconButton
            aria-label="Clear conversation"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={onClearConversation}
            isDisabled={messages.length === 0}
          />
        </Tooltip>
      </HStack>

      {/* Messages */}
      <VStack flex={1} overflowY="auto" p={4} spacing={4} align="stretch" w="full">
        {messages.length === 0 && (
          <Box textAlign="center" py={8}>
            <FiMessageSquare size={48} color="gray" />
            <Text mt={4} color={useSemanticToken('text.secondary')}>Start a conversation with {selectedAgent.name}</Text>
          </Box>
        )}

        {messages.map((message) => (
          <Flex key={message.id} justify={message.type === 'user' ? 'flex-end' : 'flex-start'}>
            <Box
              maxW="70%"
              bg={message.type === 'user' ? 'blue.500' : 'gray.100'}
              color={message.type === 'user' ? 'white' : 'black'}
              px={4} py={2} borderRadius="lg"
            >
              <Text fontSize="sm" whiteSpace="pre-wrap">{String(message.content)}</Text>
              <Text fontSize="xs" opacity={0.7} mt={1}>
                {message.timestamp.toLocaleTimeString()}
              </Text>
            </Box>
          </Flex>
        ))}

        {isTyping && (
          <Flex justify="flex-start">
            <Box bg={useSemanticToken('surface.base')} px={4} py={2} borderRadius="lg">
              <HStack spacing={1}>
                <Text fontSize="sm">{selectedAgent.name} is typing</Text>
                <Spinner size="xs" />
              </HStack>
            </Box>
          </Flex>
        )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input */}
      <HStack p={4} borderTop="1px" borderColor={borderColor} bg={sidebarBg} w="full">
        <Textarea
          placeholder={`Message ${selectedAgent.name}...`}
          value={currentMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyPress={onKeyPress}
          resize="none" minH="unset" rows={1} bg={inputBg} flex={1}
        />
        <IconButton
          aria-label="Send message"
          icon={<FiSend />}
          colorScheme="blue"
          onClick={onSendMessage}
          isDisabled={!currentMessage.trim() || isTyping}
        />
      </HStack>
    </VStack>
  );
};
