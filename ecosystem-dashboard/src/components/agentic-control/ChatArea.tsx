import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Avatar,
  Badge,
  Textarea,
} from '@chakra-ui/react';
import { FiSend, FiMessageSquare, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import { Agent, ChatMessage } from './types';
import { AgentSettingsPanel } from './AgentSettingsPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChatAreaProps {
  selectedAgent: Agent | null;
  messages: ChatMessage[];
  currentMessage: string;
  isTyping: boolean;
  onSendMessage: () => void;
  onCurrentMessageChange: (message: string) => void;
  isLoading: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
  onClearConversation?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'inactive': return 'gray';
    case 'error': return 'red';
    default: return 'gray';
  }
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  selectedAgent,
  messages,
  currentMessage,
  isTyping,
  onSendMessage,
  onCurrentMessageChange,
  isLoading,
  showSettings,
  onCloseSettings,
  onClearConversation,
}) => {
  // All hooks must be called unconditionally at the top
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const sidebarBg = useSemanticToken('surface.base');

  // Helper function to get agent name from message
  const getAgentNameForMessage = (message: ChatMessage): string => {
    if (message.type === 'user') return 'You';
    return selectedAgent?.name || 'Agent';
  };

  // Handle key press for Enter to send
  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('🔑 KeyPress in ChatArea:', { key: e.key, currentMessage, selectedAgent: selectedAgent?.id });
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('📨 Calling onSendMessage from ChatArea');
      onSendMessage();
    }
  };

  // Early returns AFTER all hooks are called
  if (!selectedAgent) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="lg" color={useSemanticToken('text.secondary')}>
          Select an agent to start chatting
        </Text>
      </Box>
    );
  }

  // Show settings panel if showSettings is true
  if (showSettings) {
    return (
      <VStack flex={1} spacing={0}>
        {/* Settings Header */}
        <HStack p={3} borderBottom="1px" borderColor={borderColor} bg={sidebarBg} w="full">
          <IconButton
            aria-label="Back to chat"
            icon={<FiArrowLeft />}
            size="sm"
            variant="ghost"
            onClick={onCloseSettings}
          />
          <Avatar size="sm" name={selectedAgent.name} />
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold">{selectedAgent.name} Settings</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Configure agent parameters
            </Text>
          </VStack>
        </HStack>

        {/* Settings Content */}
        <Box flex={1} w="full" p={4}>
          <AgentSettingsPanel
            agent={selectedAgent}
            onSaveSettings={(settings) => {
              console.log('Saving agent settings:', settings);
              // Here you would typically save to backend
              if (onCloseSettings) onCloseSettings();
            }}
          />
        </Box>
      </VStack>
    );
  }

  return (
    <Box flex={1} display="flex" flexDirection="column" h="100%" minH={0}>
      {/* Agent Header */}
      <HStack p={4} borderBottom="1px" borderColor={borderColor} bg={sidebarBg} w="full" minW={0}>
        <Avatar size="sm" name={selectedAgent.name} flexShrink={0} />
        <VStack align="start" spacing={0} flex={1} minW={0} overflow="hidden">
          <Text fontWeight="bold" isTruncated>{selectedAgent.name}</Text>
          <HStack spacing={2} flexWrap="nowrap">
            <Badge size="sm" colorScheme={getStatusColor(selectedAgent.status)} flexShrink={0}>
              {selectedAgent.status}
            </Badge>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} isTruncated>
              {selectedAgent.type}
            </Text>
          </HStack>
        </VStack>
        <HStack spacing={2} flexShrink={0}>
          <IconButton
            aria-label="Clear conversation"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={onClearConversation}
            isDisabled={messages.length === 0 || !onClearConversation}
            title="Clear conversation history"
          />
        </HStack>
      </HStack>

      {/* Messages Area - independent scroll */}
      <Box flex={1} overflowY="auto" p={3} pb={20} minH={0} position="relative">
        <VStack spacing={3} align="stretch" w="full">
          {messages.length === 0 && (
            <Box textAlign="center" py={8}>
              <FiMessageSquare size={48} color="gray" />
              <Text mt={4} color={useSemanticToken('text.secondary')}>
                Start a conversation with {selectedAgent.name}
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
                Type a message below to begin
              </Text>
            </Box>
          )}

          {messages.map((message) => (
            <Box key={message.id}>
              <HStack align="start" spacing={3}>
                {message.type === 'user' ? (
                  <Avatar size="sm" name="You" bg="blue.500" />
                ) : (
                  <Avatar size="sm" name={getAgentNameForMessage(message)} />
                )}
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold">
                      {getAgentNameForMessage(message)}
                    </Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                    {message.type === 'agent' && message.metadata?.llm_model && (
                      <Badge size="xs" colorScheme="purple">
                        {message.metadata.llm_model}
                      </Badge>
                    )}
                  </HStack>
                  <Box
                    bg={message.type === 'user' ? 'blue.50' : 'gray.50'}
                    p={3}
                    borderRadius="md"
                    maxW="100%"
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {message.content}
                    </Text>
                  </Box>
                </VStack>
              </HStack>
            </Box>
          ))}

          {isTyping && (
            <HStack align="start" spacing={3}>
              <Avatar size="sm" name={selectedAgent.name} />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontSize="sm" fontWeight="bold">
                  {selectedAgent.name}
                </Text>
                <Box bg={useSemanticToken('surface.base')} p={3} borderRadius="md">
                  <HStack spacing={1}>
                    <Box w={2} h={2} bg="gray.400" borderRadius="full" animation="pulse 1.5s infinite" />
                    <Box w={2} h={2} bg="gray.400" borderRadius="full" animation="pulse 1.5s infinite 0.2s" />
                    <Box w={2} h={2} bg="gray.400" borderRadius="full" animation="pulse 1.5s infinite 0.4s" />
                  </HStack>
                </Box>
              </VStack>
            </HStack>
          )}
        </VStack>

        {/* Bottom fade for polished transition to input bar */}
        <Box
          position="sticky"
          bottom="0"
          h="16px"
          mt="3"
          bgGradient={`linear(to-b, transparent, ${useSemanticToken('surface.elevated')})`}
          pointerEvents="none"
          zIndex={1}
        />
      </Box>

      {/* Input Area - Sticky at bottom */}
      <Box
        px={3}
        pt={3}
        pb={12}
        borderTop="1px"
        borderColor={borderColor}
        bg={sidebarBg}
        w="full"
        flexShrink={0}
        position="sticky"
        bottom={0}
        zIndex={2}
        boxShadow={useSemanticToken('glass.shadowHover')}
        backdropFilter="saturate(160%) blur(4px)"
      >
        <HStack spacing={2}>
          <Textarea
            placeholder={`Message ${selectedAgent.name}...`}
            value={currentMessage}
            onChange={(e) => onCurrentMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            resize="none"
            minH="unset"
            rows={1}
            bg={useSemanticToken('surface.elevated')}
            flex={1}
            borderRadius="md"
          />
          <IconButton
            aria-label="Send message"
            icon={<FiSend />}
            colorScheme="blue"
            onClick={() => {
              console.log('🖱️ Send button clicked in ChatArea:', { currentMessage, selectedAgent: selectedAgent?.id });
              onSendMessage();
            }}
            isDisabled={!currentMessage.trim() || isTyping || isLoading}
            size="md"
          />
        </HStack>
      </Box>
    </Box>
  );
};
