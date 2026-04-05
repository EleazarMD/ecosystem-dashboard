/**
 * Message Selection Controls
 * 
 * UI components for managing message selection in the Deep Research workspace.
 * Includes:
 * - Selection toolbar with batch actions
 * - Checkbox overlay for individual messages
 * - Delete button for removing messages
 */

import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  Checkbox,
  Badge,
  Tooltip,
  Collapse,
  Icon,
} from '@chakra-ui/react';
import {
  FiCheckSquare,
  FiSquare,
  FiTrash2,
  FiX,
  FiCheck,
  FiFilter,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MessageSelectionToolbarProps {
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClearExcluded: () => void;
  excludedCount: number;
}

export const MessageSelectionToolbar: React.FC<MessageSelectionToolbarProps> = ({
  isSelectionMode,
  onToggleSelectionMode,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onClearExcluded,
  excludedCount,
}) => {
  const borderColor = useSemanticToken('border.default');
  const bgColor = useSemanticToken('surface.raised');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  return (
    <HStack
      px={3}
      py={2}
      bg={bgColor}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      spacing={3}
      justify="space-between"
    >
      <HStack spacing={2}>
        <Tooltip label={isSelectionMode ? 'Exit selection mode' : 'Select messages for context'}>
          <IconButton
            aria-label="Toggle selection mode"
            icon={<Icon as={isSelectionMode ? FiX : FiFilter} />}
            size="sm"
            variant={isSelectionMode ? 'solid' : 'ghost'}
            colorScheme={isSelectionMode ? 'purple' : 'gray'}
            onClick={onToggleSelectionMode}
          />
        </Tooltip>
        
        {isSelectionMode && (
          <>
            <Text fontSize="xs" color={mutedColor}>
              {selectedCount}/{totalCount} included
            </Text>
            
            {excludedCount > 0 && (
              <Badge colorScheme="orange" fontSize="2xs">
                {excludedCount} excluded
              </Badge>
            )}
          </>
        )}
      </HStack>

      <Collapse in={isSelectionMode} animateOpacity>
        <HStack spacing={2}>
          <Tooltip label="Include all messages">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<FiCheckSquare size={12} />}
              onClick={onSelectAll}
            >
              All
            </Button>
          </Tooltip>
          
          <Tooltip label="Exclude all messages">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<FiSquare size={12} />}
              onClick={onDeselectAll}
            >
              None
            </Button>
          </Tooltip>
          
          {excludedCount > 0 && (
            <Tooltip label="Clear exclusions">
              <Button
                size="xs"
                variant="outline"
                colorScheme="orange"
                onClick={onClearExcluded}
              >
                Reset
              </Button>
            </Tooltip>
          )}
        </HStack>
      </Collapse>
    </HStack>
  );
};

interface MessageSelectionOverlayProps {
  messageId: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: () => void;
  onDelete: () => void;
  showDelete?: boolean;
}

export const MessageSelectionOverlay: React.FC<MessageSelectionOverlayProps> = ({
  messageId,
  isSelected,
  isSelectionMode,
  onToggle,
  onDelete,
  showDelete = true,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  if (!isSelectionMode && !isHovered) {
    return (
      <Box
        position="absolute"
        top={1}
        right={1}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        w="24px"
        h="24px"
      />
    );
  }

  return (
    <HStack
      position="absolute"
      top={1}
      right={1}
      spacing={1}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      bg="blackAlpha.600"
      borderRadius="md"
      p={1}
    >
      {isSelectionMode && (
        <Tooltip label={isSelected ? 'Exclude from context' : 'Include in context'}>
          <IconButton
            aria-label="Toggle selection"
            icon={<Icon as={isSelected ? FiEye : FiEyeOff} />}
            size="xs"
            variant="ghost"
            colorScheme={isSelected ? 'green' : 'gray'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            _hover={{ bg: 'whiteAlpha.200' }}
          />
        </Tooltip>
      )}
      
      {showDelete && isHovered && (
        <Tooltip label="Delete message">
          <IconButton
            aria-label="Delete message"
            icon={<FiTrash2 size={12} />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            _hover={{ bg: 'red.600' }}
          />
        </Tooltip>
      )}
    </HStack>
  );
};

interface SelectableMessageWrapperProps {
  children: React.ReactNode;
  messageId: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const SelectableMessageWrapper: React.FC<SelectableMessageWrapperProps> = ({
  children,
  messageId,
  isSelected,
  isSelectionMode,
  onToggle,
  onDelete,
}) => {
  const excludedBg = useSemanticToken('surface.muted');

  return (
    <Box
      position="relative"
      opacity={isSelectionMode && !isSelected ? 0.5 : 1}
      transition="opacity 0.2s"
      bg={isSelectionMode && !isSelected ? excludedBg : 'transparent'}
      borderRadius="lg"
      _hover={{
        '& .message-controls': {
          opacity: 1,
        },
      }}
    >
      {children}
      
      <Box className="message-controls" opacity={0} transition="opacity 0.2s">
        <MessageSelectionOverlay
          messageId={messageId}
          isSelected={isSelected}
          isSelectionMode={isSelectionMode}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </Box>
    </Box>
  );
};

export default MessageSelectionToolbar;
