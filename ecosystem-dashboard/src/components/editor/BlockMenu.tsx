/**
 * BlockMenu - Notion-style block action menu
 * Modern, minimal design with smooth animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuDivider,
  MenuGroup,
  Portal,
  useOutsideClick,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiMoreVertical,
  FiType,
  FiTrash2,
  FiCopy,
  FiMove,
  FiLink,
  FiMessageSquare,
  FiEdit3,
  FiChevronRight,
  FiAlignLeft,
  FiList,
  FiCheckSquare,
  FiCode,
  FiImage,
  FiFile,
  FiGrid,
} from 'react-icons/fi';
import { BlockType } from '@/lib/editor/BlockModel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BlockMenuProps {
  blockId: string;
  blockType: BlockType;
  isVisible: boolean;
  position?: { x: number; y: number };
  onConvert?: (newType: BlockType) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCopyLink?: () => void;
  onComment?: () => void;
  onColor?: (color: string) => void;
}

const BLOCK_TYPE_OPTIONS = [
  { type: 'paragraph' as BlockType, label: 'Text', icon: FiAlignLeft, description: 'Plain text' },
  { type: 'heading_1' as BlockType, label: 'Heading 1', icon: FiType, description: 'Big section heading' },
  { type: 'heading_2' as BlockType, label: 'Heading 2', icon: FiType, description: 'Medium section heading' },
  { type: 'heading_3' as BlockType, label: 'Heading 3', icon: FiType, description: 'Small section heading' },
  { type: 'bulleted_list' as BlockType, label: 'Bulleted list', icon: FiList, description: 'Create a simple list' },
  { type: 'numbered_list' as BlockType, label: 'Numbered list', icon: FiList, description: 'Create a list with numbering' },
  { type: 'checkbox' as BlockType, label: 'To-do list', icon: FiCheckSquare, description: 'Track tasks' },
  { type: 'code' as BlockType, label: 'Code', icon: FiCode, description: 'Capture a code snippet' },
  { type: 'image' as BlockType, label: 'Image', icon: FiImage, description: 'Upload or embed' },
  { type: 'file' as BlockType, label: 'File', icon: FiFile, description: 'Upload or embed' },
  { type: 'database' as BlockType, label: 'Database', icon: FiGrid, description: 'Add a database' },
];

const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', bg: 'transparent' },
  { value: 'gray', label: 'Gray', bg: 'gray.100', darkBg: 'gray.700' },
  { value: 'brown', label: 'Brown', bg: 'orange.50', darkBg: 'orange.900' },
  { value: 'orange', label: 'Orange', bg: 'orange.100', darkBg: 'orange.800' },
  { value: 'yellow', label: 'Yellow', bg: 'yellow.100', darkBg: 'yellow.800' },
  { value: 'green', label: 'Green', bg: 'green.100', darkBg: 'green.800' },
  { value: 'blue', label: 'Blue', bg: 'blue.100', darkBg: 'blue.800' },
  { value: 'purple', label: 'Purple', bg: 'purple.100', darkBg: 'purple.800' },
  { value: 'pink', label: 'Pink', bg: 'pink.100', darkBg: 'pink.800' },
  { value: 'red', label: 'Red', bg: 'red.100', darkBg: 'red.800' },
];

export const BlockMenu: React.FC<BlockMenuProps> = ({
  blockId,
  blockType,
  isVisible,
  position,
  onConvert,
  onDelete,
  onDuplicate,
  onCopyLink,
  onComment,
  onColor,
}) => {
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modern glassmorphic colors
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const dividerColor = useSemanticToken('border.subtle');

  useOutsideClick({
    ref: menuRef,
    handler: () => {
      setShowConvertMenu(false);
      setShowColorMenu(false);
    },
  });

  if (!isVisible) return null;

  return (
    <Portal>
      <Box
        ref={menuRef}
        position="fixed"
        left={position?.x || 0}
        top={position?.y || 0}
        zIndex={9999}
        bg={bgColor}
        backdropFilter="blur(12px) saturate(180%)"
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)"
        minW="240px"
        maxW="280px"
        py={1.5}
        sx={{
          '@keyframes slideIn': {
            from: { opacity: 0, transform: 'translateY(-4px) scale(0.98)' },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
          animation: 'slideIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Turn into submenu */}
        {showConvertMenu ? (
          <VStack align="stretch" spacing={0}>
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={() => setShowConvertMenu(false)}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
            >
              <FiChevronRight style={{ transform: 'rotate(180deg)', fontSize: '14px' }} />
              <Text fontSize="13px" fontWeight="500" color={textColor}>
                Turn into
              </Text>
            </HStack>
            <Box h="1px" bg={dividerColor} my={1} />
            {BLOCK_TYPE_OPTIONS.map((option) => (
              <HStack
                key={option.type}
                px={3}
                py={2}
                cursor="pointer"
                onClick={() => {
                  onConvert?.(option.type);
                  setShowConvertMenu(false);
                }}
                _hover={{ bg: hoverBg }}
                transition="all 0.12s"
                spacing={3}
              >
                <Box color={mutedColor} fontSize="16px">
                  <option.icon />
                </Box>
                <VStack align="stretch" spacing={0} flex={1}>
                  <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.3">
                    {option.label}
                  </Text>
                  <Text fontSize="11px" color={mutedColor} lineHeight="1.3">
                    {option.description}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        ) : showColorMenu ? (
          <VStack align="stretch" spacing={0}>
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              onClick={() => setShowColorMenu(false)}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
            >
              <FiChevronRight style={{ transform: 'rotate(180deg)', fontSize: '14px' }} />
              <Text fontSize="13px" fontWeight="500" color={textColor}>
                Color
              </Text>
            </HStack>
            <Box h="1px" bg={dividerColor} my={1} />
            {COLOR_OPTIONS.map((color) => (
              <HStack
                key={color.value}
                px={3}
                py={2}
                cursor="pointer"
                onClick={() => {
                  onColor?.(color.value);
                  setShowColorMenu(false);
                }}
                _hover={{ bg: hoverBg }}
                transition="all 0.12s"
                spacing={3}
              >
                <Box
                  w="16px"
                  h="16px"
                  borderRadius="sm"
                  bg={color.bg}
                  border="1px solid"
                  borderColor={borderColor}
                />
                <Text fontSize="13px" fontWeight="500" color={textColor}>
                  {color.label}
                </Text>
              </HStack>
            ))}
          </VStack>
        ) : (
          <VStack align="stretch" spacing={0}>
            {/* Main menu items */}
            {/* Main menu items */}
            <HStack
              as="button"
              onClick={() => setShowConvertMenu(true)}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              justifyContent="space-between"
            >
              <HStack spacing={3}>
                <FiType size={16} />
                <Text>Turn into</Text>
              </HStack>
              <FiChevronRight size={14} color={mutedColor} />
            </HStack>

            <HStack
              as="button"
              onClick={() => setShowColorMenu(true)}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              justifyContent="space-between"
            >
              <HStack spacing={3}>
                <Box w="16px" h="16px" borderRadius="sm" bg={useSemanticToken('surface.elevated')} border="1px solid" borderColor={borderColor} />
                <Text>Color</Text>
              </HStack>
              <FiChevronRight size={14} color={mutedColor} />
            </HStack>

            <Box h="1px" bg={dividerColor} my={1.5} />

            <HStack
              as="button"
              onClick={onCopyLink}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiLink size={16} />
              <Text>Copy link to block</Text>
            </HStack>

            <HStack
              as="button"
              onClick={onDuplicate}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiCopy size={16} />
              <Text>Duplicate</Text>
            </HStack>

            <HStack
              as="button"
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiMove size={16} />
              <Text>Move to</Text>
            </HStack>

            <Box h="1px" bg={dividerColor} my={1.5} />

            <HStack
              as="button"
              onClick={onComment}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiMessageSquare size={16} />
              <Text>Comment</Text>
            </HStack>

            <HStack
              as="button"
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: hoverBg }}
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiEdit3 size={16} />
              <Text>Suggest edits</Text>
            </HStack>

            <Box h="1px" bg={dividerColor} my={1.5} />

            <HStack
              as="button"
              onClick={onDelete}
              fontSize="13px"
              fontWeight="500"
              px={3}
              py={2}
              _hover={{ bg: 'red.50' }}
              color="red.600"
              transition="all 0.12s"
              borderRadius="md"
              mx={1}
              w="auto"
              spacing={3}
            >
              <FiTrash2 size={16} />
              <Text>Delete</Text>
            </HStack>
          </VStack>
        )}
      </Box>
    </Portal>
  );
};
