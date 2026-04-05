import React from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  XMarkIcon,
  TrashIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';

interface AIAssistantHeaderProps {
  onClose: () => void;
  onResize?: (width: number) => void;
  onCopyConversation?: () => void;
  onClearConversation?: () => void;
  hasMessages?: boolean;
  isVoiceConnected?: boolean;
  isMicrophoneMuted?: boolean;
  contextPageCount?: number;
  isContextActive?: boolean;
}

export const AIAssistantHeader: React.FC<AIAssistantHeaderProps> = ({
  onClose,
  onResize,
  onCopyConversation,
  onClearConversation,
  hasMessages = false,
  isVoiceConnected = false,
  isMicrophoneMuted = false,
  contextPageCount = 0,
  isContextActive = false,
}) => {
  const surfaceBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  return (
    <Flex
      p={4}
      align="center"
      justify="space-between"
      bg={surfaceBg}
    >
      <VStack align="start" spacing={0}>
        <HStack spacing={3}>
          <Box w={2} h={2} borderRadius="full" bg={isVoiceConnected ? "green.400" : "gray.400"} />
          <Text fontSize="lg" fontWeight="600" color={textPrimary}>
            AI Assistant
          </Text>
          <Badge
            colorScheme={isVoiceConnected ? "green" : "gray"}
            variant="subtle"
            fontSize="10px"
            px={2}
            py={0.5}
            borderRadius="full"
          >
            {isVoiceConnected ? "Connected" : "Offline"}
          </Badge>
          {isMicrophoneMuted && (
            <Badge
              colorScheme="red"
              variant="subtle"
              fontSize="10px"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              Mic muted
            </Badge>
          )}
          {isContextActive && contextPageCount > 0 && (
            <Badge
              colorScheme="purple"
              variant="solid"
              fontSize="10px"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              🧠 Context Active
            </Badge>
          )}
        </HStack>
        {isContextActive && contextPageCount > 0 && (
          <Text fontSize="9px" color={textSecondary} ml={9}>
            Seeing {contextPageCount} page{contextPageCount > 1 ? 's' : ''}
          </Text>
        )}
      </VStack>
      
      <HStack spacing={1}>
        {onClearConversation && (
          <Tooltip label="Clear chat">
            <IconButton
              aria-label="Clear chat"
              icon={<TrashIcon width={16} height={16} />}
              size="sm"
              variant="ghost"
              onClick={onClearConversation}
              isDisabled={!hasMessages}
            />
          </Tooltip>
        )}
        
        <IconButton
          aria-label="Close"
          icon={<XMarkIcon width={20} height={20} />}
          size="sm"
          variant="ghost"
          onClick={onClose}
        />
      </HStack>
    </Flex>
  );
};
