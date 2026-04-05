import React from 'react';
import {
  Box,
  HStack,
  Text,
  Avatar,
  Badge,
  Spinner,
  VStack,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useTypewriter } from '../../hooks/useTypewriter';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  sources?: string[];
  confidence?: number;
}

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const surfaceBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && message.role === 'assistant';

  // Always call useTypewriter hook (Rules of Hooks compliance)
  const typewriterContent = useTypewriter(message.content || '', 20);
  const displayedContent = isStreaming && message.content ? typewriterContent : message.content;

  return (
    <VStack align={isUser ? 'flex-end' : 'flex-start'} w="full" spacing={2}>
      <Text fontSize="xs" fontWeight="bold" color={textSecondary}>
        {isUser ? 'You' : 'AI Assistant'}
      </Text>
      <HStack
        spacing={3}
        align="flex-start"
        justify={isUser ? 'flex-end' : 'flex-start'}
        w="full"
        mb={4}
      >
        {!isUser && (
          <Avatar
            size="sm"
            name="AI Assistant"
            bg="blue.500"
            color="whiteAlpha.900"
          />
        )}

        <Box
          maxW="80%"
          bg={isUser ? 'blue.500' : surfaceBg}
          color={isUser ? 'white' : textPrimary}
          px={4}
          py={3}
          borderRadius="2xl"
          border={isUser ? 'none' : `1px solid ${borderColor}`}
          position="relative"
        >
          {isStreaming && !message.content ? (
            <HStack spacing={2}>
              <Spinner size="xs" />
              <Text fontSize="sm" color={isUser ? 'whiteAlpha.800' : textSecondary}>Typing...</Text>
            </HStack>
          ) : (
            <Text fontSize="sm" lineHeight="1.4">
              {displayedContent}
            </Text>
          )}

          {message.sources && message.sources.length > 0 && (
            <HStack spacing={1} mt={2} flexWrap="wrap">
              {message.sources.map((source, index) => (
                <Badge
                  key={index}
                  size="xs"
                  colorScheme={isUser ? "whiteAlpha" : "blue"}
                  variant="subtle"
                >
                  {source}
                </Badge>
              ))}
            </HStack>
          )}

          {message.confidence !== undefined && !isStreaming && (
            <Text fontSize="xs" color={isUser ? 'whiteAlpha.800' : textSecondary} mt={1}>
              Confidence: {Math.round(message.confidence * 100)}%
            </Text>
          )}
        </Box>

        {isUser && (
          <Avatar
            size="sm"
            name="User"
            bg="gray.500"
          />
        )}
      </HStack>
    </VStack>
  );
};
