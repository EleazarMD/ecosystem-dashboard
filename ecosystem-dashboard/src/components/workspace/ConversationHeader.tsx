/**
 * Conversation Header for Goose AI
 * Shows current conversation title with edit and actions
 */

import React, { useState } from 'react';
import {
  HStack,
  Text,
  Input,
  IconButton,
  Badge,
  Tooltip,
  Box,
} from '@chakra-ui/react';
import {
  FiEdit2,
  FiCheck,
  FiX,
  FiStar,
  FiTrash2,
} from 'react-icons/fi';
import type { AIConversation } from '@/types/workspace-ai';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ConversationHeaderProps {
  conversation: AIConversation | null;
  onUpdateTitle: (title: string) => void;
  onTogglePin: () => void;
  onArchive: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onUpdateTitle,
  onTogglePin,
  onArchive,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');

  const handleStartEdit = () => {
    if (conversation) {
      setEditTitle(conversation.title);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdateTitle(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
  };

  if (!conversation) {
    return (
      <HStack spacing={3} p={3} borderBottom="1px solid" borderColor={useSemanticToken('border.default')}>
        <Text fontSize="lg" fontWeight="semibold" color={textColor}>
          Goose AI
        </Text>
        <Badge colorScheme="gray" fontSize="xs">
          No conversation
        </Badge>
      </HStack>
    );
  }

  return (
    <HStack
      spacing={3}
      p={3}
      borderBottom="1px solid"
      borderColor={borderColor}
      justify="space-between"
    >
      {/* Title */}
      <HStack flex="1" spacing={2} minW={0}>
        {isEditing ? (
          <>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              size="sm"
              autoFocus
              flex="1"
            />
            <IconButton
              icon={<FiCheck />}
              size="sm"
              colorScheme="green"
              onClick={handleSaveEdit}
              aria-label="Save title"
            />
            <IconButton
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              aria-label="Cancel edit"
            />
          </>
        ) : (
          <>
            <Text
              fontSize="lg"
              fontWeight="semibold"
              color={textColor}
              noOfLines={1}
              flex="1"
            >
              {conversation.title}
            </Text>
            <Tooltip label="Rename conversation">
              <IconButton
                icon={<FiEdit2 />}
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                aria-label="Edit title"
                _hover={{ bg: bgHover }}
              />
            </Tooltip>
          </>
        )}
      </HStack>

      {/* Actions */}
      {!isEditing && (
        <HStack spacing={2}>
          {/* Message count */}
          <Badge colorScheme="gray" fontSize="xs">
            {conversation.message_count} msgs
          </Badge>

          {/* Cost */}
          {Number(conversation.total_cost) > 0 && (
            <Badge colorScheme="blue" fontSize="xs">
              ${Number(conversation.total_cost).toFixed(4)}
            </Badge>
          )}

          {/* Pin toggle */}
          <Tooltip label={conversation.pinned ? 'Unpin' : 'Pin conversation'}>
            <IconButton
              icon={<FiStar />}
              size="sm"
              variant="ghost"
              onClick={onTogglePin}
              color={conversation.pinned ? 'orange.400' : undefined}
              aria-label={conversation.pinned ? 'Unpin' : 'Pin'}
              _hover={{ bg: bgHover }}
            />
          </Tooltip>

          {/* Archive */}
          <Tooltip label="Archive conversation">
            <IconButton
              icon={<FiTrash2 />}
              size="sm"
              variant="ghost"
              onClick={onArchive}
              colorScheme="red"
              aria-label="Archive"
              _hover={{ bg: 'red.50' }}
            />
          </Tooltip>
        </HStack>
      )}
    </HStack>
  );
};
