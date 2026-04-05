/**
 * BlockComments - Comment thread for workspace blocks
 * Notion-style inline comments with resolve functionality
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Badge,
  Avatar,
  Tooltip,
  Portal,
} from '@chakra-ui/react';
import { FiX, FiCheck, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { BlockComment } from '@/lib/editor/BlockModel';

interface BlockCommentsProps {
  blockId: string;
  comments: BlockComment[];
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddComment: (blockId: string, text: string) => void;
  onDeleteComment: (blockId: string, commentId: string) => void;
  onResolveComment?: (blockId: string, commentId: string) => void;
}

export function BlockComments({
  blockId,
  comments,
  isOpen,
  position,
  onClose,
  onAddComment,
  onDeleteComment,
  onResolveComment,
}: BlockCommentsProps) {
  const [newComment, setNewComment] = useState('');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(blockId, newComment.trim());
      setNewComment('');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        left={position.x}
        top={position.y}
        zIndex={9999}
        bg={bgColor}
        backdropFilter="blur(12px) saturate(180%)"
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="0 12px 40px rgba(0, 0, 0, 0.15)"
        w="320px"
        maxH="400px"
        overflow="hidden"
        sx={{
          '@keyframes slideIn': {
            from: { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
          animation: 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <HStack px={4} py={3} borderBottom="1px solid" borderColor={borderColor} justify="space-between">
          <HStack spacing={2}>
            <FiMessageSquare size={16} />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              Comments
            </Text>
            {comments.length > 0 && (
              <Badge colorScheme="blue" size="sm" borderRadius="full">
                {comments.length}
              </Badge>
            )}
          </HStack>
          <IconButton
            aria-label="Close"
            icon={<FiX />}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        </HStack>

        {/* Comments list */}
        <VStack
          align="stretch"
          spacing={0}
          maxH="250px"
          overflowY="auto"
          px={2}
          py={2}
        >
          {comments.length === 0 ? (
            <Box px={2} py={4} textAlign="center">
              <Text fontSize="sm" color={mutedColor}>
                No comments yet
              </Text>
              <Text fontSize="xs" color={mutedColor} mt={1}>
                Add a comment to start a discussion
              </Text>
            </Box>
          ) : (
            comments.map((comment) => (
              <Box
                key={comment.id}
                p={3}
                borderRadius="md"
                bg={comment.resolved ? 'green.50' : 'transparent'}
                _hover={{ bg: comment.resolved ? 'green.100' : 'gray.50' }}
                transition="all 0.15s"
              >
                <HStack justify="space-between" mb={1}>
                  <HStack spacing={2}>
                    <Avatar size="xs" name={comment.author} />
                    <Text fontSize="xs" fontWeight="600" color={textColor}>
                      {comment.author}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      {formatTime(comment.createdAt)}
                    </Text>
                  </HStack>
                  <HStack spacing={1}>
                    {onResolveComment && !comment.resolved && (
                      <Tooltip label="Resolve">
                        <IconButton
                          aria-label="Resolve"
                          icon={<FiCheck />}
                          size="xs"
                          variant="ghost"
                          colorScheme="green"
                          onClick={() => onResolveComment(blockId, comment.id)}
                        />
                      </Tooltip>
                    )}
                    <Tooltip label="Delete">
                      <IconButton
                        aria-label="Delete"
                        icon={<FiTrash2 />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => onDeleteComment(blockId, comment.id)}
                      />
                    </Tooltip>
                  </HStack>
                </HStack>
                <Text fontSize="sm" color={textColor} pl={6}>
                  {comment.text}
                </Text>
                {comment.resolved && (
                  <Badge colorScheme="green" size="sm" ml={6} mt={1}>
                    Resolved
                  </Badge>
                )}
              </Box>
            ))
          )}
        </VStack>

        {/* Add comment input */}
        <Box px={3} py={3} borderTop="1px solid" borderColor={borderColor}>
          <HStack>
            <Input
              size="sm"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              borderRadius="md"
            />
            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleSubmit}
              isDisabled={!newComment.trim()}
            >
              Add
            </Button>
          </HStack>
        </Box>
      </Box>
    </Portal>
  );
}

// Comment indicator badge for blocks
interface CommentIndicatorProps {
  count: number;
  onClick: () => void;
}

export function CommentIndicator({ count, onClick }: CommentIndicatorProps) {
  if (count === 0) return null;

  return (
    <Tooltip label={`${count} comment${count > 1 ? 's' : ''}`}>
      <Badge
        colorScheme="blue"
        borderRadius="full"
        cursor="pointer"
        onClick={onClick}
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={0.5}
        fontSize="xs"
        _hover={{ transform: 'scale(1.05)' }}
        transition="transform 0.15s"
      >
        <FiMessageSquare size={10} />
        {count}
      </Badge>
    </Tooltip>
  );
}
