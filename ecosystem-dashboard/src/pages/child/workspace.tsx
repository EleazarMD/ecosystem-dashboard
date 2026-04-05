/**
 * Child Workspace Page - Notion-Inspired
 * 
 * Kid-friendly workspace with:
 * - Page-based document system (like Notion)
 * - Block-based editing
 * - Templates for stories, homework, lists, travel plans
 * - Integration with journal, planner, chat via right panel
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  useToast,
  Input,
  Spinner,
  SimpleGrid,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tooltip,
  Flex,
  Spacer,
  Divider,
  Checkbox,
  Textarea,
  Collapse,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiFileText,
  FiTrash2,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiMoreHorizontal,
  FiClock,
  FiSearch,
  FiGrid,
  FiList,
  FiStar,
  FiFolder,
  FiHome,
  FiBook,
  FiCheckSquare,
  FiMapPin,
  FiTarget,
  FiFeather,
  FiX,
} from 'react-icons/fi';
import { RxDragHandleDots2 } from 'react-icons/rx';
import { FiBold, FiItalic, FiUnderline, FiMessageSquare } from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { StudentProgressProvider } from '@/contexts/StudentProgressContext';
import {
  ChildWorkspace,
  ChildBlock,
  ChildPageTemplate,
  ChildRichText,
  CHILD_BLOCK_CONFIG,
  TEMPLATE_CATEGORY_CONFIG,
  CALLOUT_COLORS,
  TemplateCategory,
  ChildBlockType,
} from '@/types/child-workspace';
import { FormatToolbar } from '@/components/editor/FormatToolbar';
import { useTextSelection } from '@/hooks/useTextSelection';

// ============================================================================
// Block Colors Configuration
// ============================================================================

const BLOCK_COLORS = {
  default: { bg: 'transparent', label: 'Default' },
  gray: { bg: 'gray.100', label: 'Gray' },
  brown: { bg: 'orange.50', label: 'Brown' },
  orange: { bg: 'orange.100', label: 'Orange' },
  yellow: { bg: 'yellow.100', label: 'Yellow' },
  green: { bg: 'green.100', label: 'Green' },
  blue: { bg: 'blue.100', label: 'Blue' },
  purple: { bg: 'purple.100', label: 'Purple' },
  pink: { bg: 'pink.100', label: 'Pink' },
  red: { bg: 'red.100', label: 'Red' },
};

// ============================================================================
// Slash Command Menu Component
// ============================================================================

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: ChildBlockType) => void;
  position: { top: number; left: number };
  searchTerm: string;
}

function SlashCommandMenu({ isOpen, onClose, onSelect, position, searchTerm }: SlashCommandMenuProps) {
  const commands = [
    { type: 'paragraph' as ChildBlockType, label: 'Text', icon: '📝', description: 'Plain text' },
    { type: 'heading_1' as ChildBlockType, label: 'Heading 1', icon: 'H₁', description: 'Big section heading' },
    { type: 'heading_2' as ChildBlockType, label: 'Heading 2', icon: 'H₂', description: 'Medium section heading' },
    { type: 'heading_3' as ChildBlockType, label: 'Heading 3', icon: 'H₃', description: 'Small section heading' },
    { type: 'bulleted_list' as ChildBlockType, label: 'Bulleted list', icon: '•', description: 'Simple bullet points' },
    { type: 'numbered_list' as ChildBlockType, label: 'Numbered list', icon: '1.', description: 'Numbered items' },
    { type: 'to_do' as ChildBlockType, label: 'To-do list', icon: '☐', description: 'Checkboxes' },
    { type: 'toggle' as ChildBlockType, label: 'Toggle', icon: '▶', description: 'Collapsible content' },
    { type: 'callout' as ChildBlockType, label: 'Callout', icon: '💡', description: 'Highlighted box' },
    { type: 'quote' as ChildBlockType, label: 'Quote', icon: '❝', description: 'Quote block' },
    { type: 'divider' as ChildBlockType, label: 'Divider', icon: '—', description: 'Horizontal line' },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top={`${position.top}px`}
      left={`${position.left}px`}
      bg="white"
      borderRadius="lg"
      boxShadow="lg"
      border="1px solid"
      borderColor="gray.200"
      zIndex={1000}
      maxH="300px"
      overflowY="auto"
      minW="250px"
    >
      <Text px={3} py={2} fontSize="xs" color="gray.500" fontWeight="medium">
        BASIC BLOCKS
      </Text>
      {filteredCommands.length === 0 ? (
        <Text px={3} py={2} fontSize="sm" color="gray.400">No results</Text>
      ) : (
        filteredCommands.map((cmd) => (
          <Box
            key={cmd.type}
            px={3}
            py={2}
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            onClick={() => {
              onSelect(cmd.type);
              onClose();
            }}
          >
            <HStack spacing={3}>
              <Box
                w="20px"
                h="20px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="sm"
                bg="gray.100"
                fontSize="xs"
                fontWeight="medium"
              >
                {cmd.icon}
              </Box>
              <Box>
                <Text fontSize="xs" fontWeight="medium">{cmd.label}</Text>
                <Text fontSize="xs" color="gray.500">{cmd.description}</Text>
              </Box>
            </HStack>
          </Box>
        ))
      )}
    </Box>
  );
}

// ============================================================================
// Inline Formatting Toolbar Component
// ============================================================================

interface FormatToolbarProps {
  isVisible: boolean;
  position: { top: number; left: number };
  onFormat: (format: 'bold' | 'italic' | 'underline') => void;
}

function InlineFormatToolbar({ isVisible, position, onFormat }: FormatToolbarProps) {
  if (!isVisible) return null;

  return (
    <HStack
      position="fixed"
      top={`${position.top - 40}px`}
      left={`${position.left}px`}
      bg="gray.800"
      borderRadius="md"
      p={1}
      spacing={0}
      zIndex={1001}
      boxShadow="lg"
    >
      <IconButton
        aria-label="Bold"
        icon={<FiBold />}
        size="sm"
        variant="ghost"
        color="white"
        _hover={{ bg: 'gray.700' }}
        onClick={() => onFormat('bold')}
      />
      <IconButton
        aria-label="Italic"
        icon={<FiItalic />}
        size="sm"
        variant="ghost"
        color="white"
        _hover={{ bg: 'gray.700' }}
        onClick={() => onFormat('italic')}
      />
      <IconButton
        aria-label="Underline"
        icon={<FiUnderline />}
        size="sm"
        variant="ghost"
        color="white"
        _hover={{ bg: 'gray.700' }}
        onClick={() => onFormat('underline')}
      />
    </HStack>
  );
}

// ============================================================================
// Block Comment Component
// ============================================================================

interface BlockComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface BlockCommentPopoverProps {
  blockId: string;
  comments: BlockComment[];
  onAddComment: (blockId: string, text: string) => void;
  onDeleteComment: (blockId: string, commentId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

function BlockCommentPopover({ blockId, comments, onAddComment, onDeleteComment, isOpen, onClose }: BlockCommentPopoverProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(blockId, newComment.trim());
      setNewComment('');
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      position="absolute"
      right="-280px"
      top="0"
      w="260px"
      bg="white"
      borderRadius="lg"
      boxShadow="lg"
      border="1px solid"
      borderColor="gray.200"
      zIndex={100}
      p={3}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="bold">💬 Comments</Text>
        <IconButton
          aria-label="Close"
          icon={<FiX />}
          size="xs"
          variant="ghost"
          onClick={onClose}
        />
      </HStack>
      
      {comments.length === 0 ? (
        <Text fontSize="xs" color="gray.400" mb={2}>No comments yet</Text>
      ) : (
        <VStack align="stretch" spacing={2} mb={2} maxH="150px" overflowY="auto">
          {comments.map((comment) => (
            <Box key={comment.id} bg="gray.50" p={2} borderRadius="md">
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="medium">{comment.author}</Text>
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => onDeleteComment(blockId, comment.id)}
                />
              </HStack>
              <Text fontSize="xs">{comment.text}</Text>
            </Box>
          ))}
        </VStack>
      )}
      
      <HStack>
        <Input
          size="xs"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button size="xs" colorScheme="blue" onClick={handleSubmit}>
          Add
        </Button>
      </HStack>
    </Box>
  );
}

// ============================================================================
// Child Block Editor Component
// ============================================================================

interface BlockEditorProps {
  block: ChildBlock;
  onUpdate: (blockId: string, content: ChildRichText[], properties?: any) => void;
  onDelete: (blockId: string) => void;
  onAddBlock: (afterBlockId: string, type: ChildBlockType) => void;
  onTransformBlock: (blockId: string, newType: ChildBlockType) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (blockId: string) => void;
  onSetBlockColor?: (blockId: string, color: string) => void;
  onAddComment?: (blockId: string, text: string) => void;
  onDeleteComment?: (blockId: string, commentId: string) => void;
  isMinecraft: boolean;
  isPusheen: boolean;
  primaryColor: string;
  index: number;
  totalBlocks: number;
  isDragging?: boolean;
}

function BlockEditor({ block, onUpdate, onDelete, onAddBlock, onTransformBlock, onMoveBlock, onDuplicateBlock, onSetBlockColor, onAddComment, onDeleteComment, isMinecraft, isPusheen, primaryColor, index, totalBlocks, isDragging }: BlockEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTurnIntoSubmenu, setShowTurnIntoSubmenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearchTerm, setSlashSearchTerm] = useState('');
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [formatToolbarPosition, setFormatToolbarPosition] = useState({ top: 0, left: 0 });
  const [showComments, setShowComments] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const initialContentRef = useRef<string>('');
  
  // Get comments from block properties
  const comments: BlockComment[] = block.properties?.comments || [];

  // Initialize content when entering edit mode
  const startEditing = useCallback(() => {
    const currentText = block.content[0]?.text || '';
    initialContentRef.current = currentText;
    setIsEditing(true);
    // Set content after state update
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.textContent = currentText;
        editorRef.current.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        if (editorRef.current.childNodes.length > 0) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        } else {
          range.setStart(editorRef.current, 0);
          range.collapse(true);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  }, [block.content]);

  const handleSave = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      // Only update if content actually changed
      if (text !== initialContentRef.current) {
        onUpdate(block.id, [{ text }], block.properties);
      }
    }
    setIsEditing(false);
  }, [block.id, block.properties, onUpdate]);

  // Handle slash command input
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || '';
    
    // Check for slash command
    if (text.endsWith('/')) {
      const rect = editorRef.current.getBoundingClientRect();
      setSlashMenuPosition({ top: rect.bottom + 5, left: rect.left });
      setSlashSearchTerm('');
      setShowSlashMenu(true);
    } else if (showSlashMenu) {
      // Update search term for slash menu
      const slashIndex = text.lastIndexOf('/');
      if (slashIndex >= 0) {
        setSlashSearchTerm(text.slice(slashIndex + 1));
      } else {
        setShowSlashMenu(false);
      }
    }
  }, [showSlashMenu]);

  // Handle slash command selection
  const handleSlashSelect = useCallback((type: ChildBlockType) => {
    if (editorRef.current) {
      // Remove the slash and search term
      const text = editorRef.current.textContent || '';
      const slashIndex = text.lastIndexOf('/');
      if (slashIndex >= 0) {
        editorRef.current.textContent = text.slice(0, slashIndex);
      }
    }
    setShowSlashMenu(false);
    handleSave();
    onTransformBlock(block.id, type);
  }, [block.id, handleSave, onTransformBlock]);

  // Handle text selection for formatting toolbar
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0 && isEditing) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFormatToolbarPosition({ top: rect.top, left: rect.left + rect.width / 2 - 50 });
      setShowFormatToolbar(true);
    } else {
      setShowFormatToolbar(false);
    }
  }, [isEditing]);

  // Apply formatting
  const handleFormat = useCallback((format: 'bold' | 'italic' | 'underline') => {
    document.execCommand(format);
    setShowFormatToolbar(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close slash menu on escape
    if (e.key === 'Escape' && showSlashMenu) {
      e.preventDefault();
      setShowSlashMenu(false);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (showSlashMenu) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleSave();
      onAddBlock(block.id, 'paragraph');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (editorRef.current) {
        editorRef.current.textContent = block.content[0]?.text || '';
      }
      setIsEditing(false);
    }
    // Formatting shortcuts
    if ((e.metaKey || e.ctrlKey) && isEditing) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          break;
      }
    }
  };

  const handleCheckToggle = () => {
    onUpdate(block.id, block.content, { ...block.properties, checked: !block.properties.checked });
  };

  const renderBlockContent = () => {
    const text = block.content[0]?.text || '';

    switch (block.type) {
      case 'heading_1':
        return (
          <Text fontSize="lg" fontWeight="bold" color={primaryColor}>
            {text || 'Heading 1'}
          </Text>
        );
      case 'heading_2':
        return (
          <Text fontSize="md" fontWeight="bold" color={primaryColor}>
            {text || 'Heading 2'}
          </Text>
        );
      case 'heading_3':
        return (
          <Text fontSize="sm" fontWeight="semibold" color={primaryColor}>
            {text || 'Heading 3'}
          </Text>
        );
      case 'bulleted_list':
        return (
          <HStack align="start" fontSize="sm">
            <Text>•</Text>
            <Text flex={1}>{text}</Text>
          </HStack>
        );
      case 'numbered_list':
        return (
          <HStack align="start" fontSize="sm">
            <Text fontWeight="medium">{(block.position || 0) + 1}.</Text>
            <Text flex={1}>{text}</Text>
          </HStack>
        );
      case 'to_do':
        return (
          <HStack align="start" fontSize="sm">
            <Checkbox
              isChecked={block.properties.checked}
              onChange={handleCheckToggle}
              colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
              size="sm"
            />
            <Text
              flex={1}
              textDecoration={block.properties.checked ? 'line-through' : 'none'}
              color={block.properties.checked ? 'gray.400' : 'inherit'}
            >
              {text}
            </Text>
          </HStack>
        );
      case 'quote':
        return (
          <Box borderLeft="2px solid" borderColor={primaryColor} pl={2} fontStyle="italic" color="gray.600" fontSize="sm">
            <Text>{text || 'Quote'}</Text>
          </Box>
        );
      case 'callout':
        const color = block.properties.color || 'blue';
        const colorConfig = CALLOUT_COLORS[color as keyof typeof CALLOUT_COLORS] || CALLOUT_COLORS.blue;
        return (
          <Box
            bg={colorConfig.bg}
            border="1px solid"
            borderColor={colorConfig.border}
            borderRadius={isMinecraft ? '4px' : 'lg'}
            p={2}
          >
            <HStack align="start" fontSize="sm">
              <Text fontSize="sm">{typeof block.properties.icon === 'object' && block.properties.icon?.emoji ? block.properties.icon.emoji : (block.properties.icon || '💡')}</Text>
              <Text color={colorConfig.text} flex={1}>{text}</Text>
            </HStack>
          </Box>
        );
      case 'divider':
        return <Divider borderColor="gray.300" />;
      case 'toggle':
        return (
          <Box fontSize="sm">
            <HStack cursor="pointer">
              <Text>{block.properties.collapsed ? '▶' : '▼'}</Text>
              <Text fontWeight="medium">{text || 'Toggle'}</Text>
            </HStack>
          </Box>
        );
      default:
        return <Text fontSize="sm" color={text ? 'inherit' : 'gray.400'}>{text || 'Type something...'}</Text>;
    }
  };

  if (block.type === 'divider') {
    return (
      <Box
        py={2}
        position="relative"
        _hover={{ '& .block-menu': { opacity: 1 } }}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {renderBlockContent()}
        {showMenu && (
          <IconButton
            className="block-menu"
            aria-label="Delete"
            icon={<FiTrash2 />}
            size="xs"
            position="absolute"
            right={0}
            top="50%"
            transform="translateY(-50%)"
            variant="ghost"
            colorScheme="red"
            onClick={() => onDelete(block.id)}
          />
        )}
      </Box>
    );
  }

  // Block type options for formatting menu
  const blockTypeOptions: { type: ChildBlockType; label: string; icon: string; shortcut?: string }[] = [
    { type: 'paragraph', label: 'Text', icon: 'T', shortcut: '' },
    { type: 'heading_1', label: 'Heading 1', icon: 'H₁', shortcut: '#' },
    { type: 'heading_2', label: 'Heading 2', icon: 'H₂', shortcut: '##' },
    { type: 'heading_3', label: 'Heading 3', icon: 'H₃', shortcut: '###' },
    { type: 'bulleted_list', label: 'Bulleted list', icon: '•', shortcut: '-' },
    { type: 'numbered_list', label: 'Numbered list', icon: '1.', shortcut: '1.' },
    { type: 'to_do', label: 'To-do list', icon: '☐', shortcut: '[]' },
    { type: 'toggle', label: 'Toggle list', icon: '▶', shortcut: '>' },
    { type: 'callout', label: 'Callout', icon: '💡', shortcut: '' },
    { type: 'quote', label: 'Quote', icon: '❝', shortcut: '"' },
    { type: 'divider', label: 'Divider', icon: '—', shortcut: '---' },
  ];

  return (
    <HStack
      spacing={0}
      align="flex-start"
      position="relative"
      py={1}
      _hover={{ '& .block-controls': { opacity: 1 } }}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => {
        setShowMenu(false);
        setShowAddMenu(false);
      }}
    >
      {/* Left side controls - + button and drag handle */}
      <HStack
        className="block-controls"
        opacity={0}
        transition="opacity 0.15s"
        spacing={0}
        mr={1}
        flexShrink={0}
        pt={block.type.startsWith('heading') ? 1 : 0}
      >
        {/* Add block button (+) */}
        <Menu isOpen={showAddMenu} onClose={() => setShowAddMenu(false)}>
          <Tooltip label="Click to add below" placement="top" fontSize="xs" hasArrow>
            <MenuButton
              as={IconButton}
              icon={<FiPlus />}
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'gray.600', bg: 'gray.100' }}
              aria-label="Add block"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
              }}
              minW="24px"
              h="24px"
            />
          </Tooltip>
          <MenuList fontSize="sm" zIndex={1000} maxH="400px" overflowY="auto" minW="250px">
            <Text px={3} py={2} fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase">
              Basic blocks
            </Text>
            {blockTypeOptions.map((opt) => (
              <MenuItem
                key={opt.type}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBlock(block.id, opt.type);
                  setShowAddMenu(false);
                }}
                py={2}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={3}>
                    <Box
                      w="20px"
                      h="20px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      borderRadius="sm"
                      bg="gray.100"
                      fontSize="xs"
                      fontWeight="medium"
                    >
                      {opt.icon}
                    </Box>
                    <Text fontSize="sm">{opt.label}</Text>
                  </HStack>
                  {opt.shortcut && (
                    <Text fontSize="xs" color="gray.400">{opt.shortcut}</Text>
                  )}
                </HStack>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>

        {/* Drag handle (6 dots) with block options menu */}
        <Menu>
          <Tooltip label="Drag to move • Click for options" placement="top" fontSize="xs" hasArrow>
            <MenuButton
              as={IconButton}
              icon={<RxDragHandleDots2 />}
              size="xs"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'gray.600', bg: 'gray.100' }}
              aria-label="Drag or click for options"
              cursor="grab"
              minW="24px"
              h="24px"
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
          <MenuList fontSize="xs" zIndex={1000} minW="200px" py={1}>
            {/* Block type indicator */}
            <Text px={3} py={1} fontSize="xs" color="gray.400">
              {blockTypeOptions.find(o => o.type === block.type)?.label || 'Block'}
            </Text>
            
            {/* Turn into - with submenu */}
            <Menu placement="right-start">
              <MenuItem
                as={MenuButton}
                py={2}
                onMouseEnter={() => setShowTurnIntoSubmenu(true)}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={3}>
                    <Text fontSize="sm">↻</Text>
                    <Text>Turn into</Text>
                  </HStack>
                  <Text color="gray.400">›</Text>
                </HStack>
              </MenuItem>
              {showTurnIntoSubmenu && (
                <MenuList fontSize="sm" zIndex={1001} minW="200px">
                  {blockTypeOptions.filter(opt => opt.type !== 'divider').map((opt) => (
                    <MenuItem
                      key={opt.type}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransformBlock(block.id, opt.type);
                        setShowTurnIntoSubmenu(false);
                      }}
                      bg={block.type === opt.type ? 'blue.50' : undefined}
                      fontWeight={block.type === opt.type ? 'medium' : 'normal'}
                      py={1.5}
                    >
                      <HStack spacing={2}>
                        <Box w="20px" textAlign="center" fontSize="sm">{opt.icon}</Box>
                        <Text>{opt.label}</Text>
                      </HStack>
                    </MenuItem>
                  ))}
                </MenuList>
              )}
            </Menu>

            <Divider my={1} />

            {/* Duplicate */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateBlock(block.id);
              }}
              py={2}
            >
              <HStack w="full" justify="space-between">
                <HStack spacing={3}>
                  <Text fontSize="sm">⧉</Text>
                  <Text>Duplicate</Text>
                </HStack>
                <Text fontSize="xs" color="gray.400">⌘D</Text>
              </HStack>
            </MenuItem>

            {/* Move up */}
            {index > 0 && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlock(block.id, 'up');
                }}
                py={2}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={3}>
                    <Text fontSize="sm">↑</Text>
                    <Text>Move up</Text>
                  </HStack>
                </HStack>
              </MenuItem>
            )}

            {/* Move down */}
            {index < totalBlocks - 1 && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlock(block.id, 'down');
                }}
                py={2}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={3}>
                    <Text fontSize="sm">↓</Text>
                    <Text>Move down</Text>
                  </HStack>
                </HStack>
              </MenuItem>
            )}

            <Divider my={1} />

            {/* Color submenu */}
            {onSetBlockColor && (
              <>
                <Text px={3} py={1} fontSize="xs" color="gray.500" fontWeight="medium" textTransform="uppercase">
                  Color
                </Text>
                <SimpleGrid columns={5} spacing={1} px={2} pb={2}>
                  {Object.entries(BLOCK_COLORS).map(([colorKey, colorConfig]) => (
                    <Box
                      key={colorKey}
                      w="24px"
                      h="24px"
                      bg={colorConfig.bg === 'transparent' ? 'white' : colorConfig.bg}
                      border="2px solid"
                      borderColor={block.properties?.bgColor === colorKey ? 'blue.500' : 'gray.200'}
                      borderRadius="md"
                      cursor="pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetBlockColor(block.id, colorKey);
                      }}
                      _hover={{ borderColor: 'blue.300' }}
                    />
                  ))}
                </SimpleGrid>
                <Divider my={1} />
              </>
            )}

            {/* Comment */}
            {onAddComment && (
              <MenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(true);
                }}
                py={2}
              >
                <HStack w="full" justify="space-between">
                  <HStack spacing={3}>
                    <Text fontSize="sm">💬</Text>
                    <Text>Comment</Text>
                    {comments.length > 0 && (
                      <Badge size="sm" colorScheme="blue">{comments.length}</Badge>
                    )}
                  </HStack>
                </HStack>
              </MenuItem>
            )}

            <Divider my={1} />

            {/* Delete */}
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}
              py={2}
            >
              <HStack w="full" justify="space-between">
                <HStack spacing={3}>
                  <Text fontSize="sm">🗑</Text>
                  <Text>Delete</Text>
                </HStack>
                <Text fontSize="xs" color="gray.400">Del</Text>
              </HStack>
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>

      {/* Block content */}
      <Box
        flex={1}
        px={2}
        py={1}
        borderRadius={isMinecraft ? '4px' : 'md'}
        bg={block.properties?.bgColor ? BLOCK_COLORS[block.properties.bgColor as keyof typeof BLOCK_COLORS]?.bg : 'transparent'}
        _hover={{ bg: block.properties?.bgColor ? undefined : 'gray.50' }}
        cursor="text"
        onClick={() => !isEditing && startEditing()}
        opacity={isDragging ? 0.5 : 1}
      >
        {isEditing ? (
          <Box
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onSelect={handleSelectionChange}
            style={{
              outline: 'none',
              minHeight: '24px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: block.type.startsWith('heading') ? (block.type === 'heading_1' ? '1.5rem' : block.type === 'heading_2' ? '1.25rem' : '1.125rem') : '1rem',
              fontWeight: block.type.startsWith('heading') ? 'bold' : 'normal',
            }}
          />
        ) : (
          renderBlockContent()
        )}
      </Box>

      {/* Slash Command Menu */}
      <SlashCommandMenu
        isOpen={showSlashMenu}
        onClose={() => setShowSlashMenu(false)}
        onSelect={handleSlashSelect}
        position={slashMenuPosition}
        searchTerm={slashSearchTerm}
      />

      {/* Inline Format Toolbar */}
      <InlineFormatToolbar
        isVisible={showFormatToolbar}
        position={formatToolbarPosition}
        onFormat={handleFormat}
      />

      {/* Comment Popover */}
      {onAddComment && onDeleteComment && (
        <BlockCommentPopover
          blockId={block.id}
          comments={comments}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Comment indicator */}
      {comments.length > 0 && !showComments && (
        <Box
          position="absolute"
          right="-8px"
          top="50%"
          transform="translateY(-50%)"
          cursor="pointer"
          onClick={() => setShowComments(true)}
        >
          <Badge colorScheme="blue" borderRadius="full" fontSize="xs">
            💬 {comments.length}
          </Badge>
        </Box>
      )}
    </HStack>
  );
}

// ============================================================================
// Sortable Block Wrapper for Drag and Drop
// ============================================================================

interface SortableBlockWrapperProps {
  block: ChildBlock;
  onUpdate: (blockId: string, content: ChildRichText[], properties?: any) => void;
  onDelete: (blockId: string) => void;
  onAddBlock: (afterBlockId: string, type: ChildBlockType) => void;
  onTransformBlock: (blockId: string, newType: ChildBlockType) => void;
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (blockId: string) => void;
  onSetBlockColor: (blockId: string, color: string) => void;
  onAddComment?: (blockId: string, text: string) => void;
  onDeleteComment?: (blockId: string, commentId: string) => void;
  isMinecraft: boolean;
  isPusheen: boolean;
  primaryColor: string;
  index: number;
  totalBlocks: number;
}

function SortableBlockWrapper(props: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BlockEditor
        {...props}
        isDragging={isDragging}
      />
    </Box>
  );
}

// ============================================================================
// Page Card Component
// ============================================================================

interface PageCardProps {
  page: ChildBlock;
  onClick: () => void;
  onDelete: () => void;
  isMinecraft: boolean;
  isPusheen: boolean;
  primaryColor: string;
}

function PageCard({ page, onClick, onDelete, isMinecraft, isPusheen, primaryColor }: PageCardProps) {
  const title = page.properties.title?.[0]?.text || 'Untitled';
  const icon = typeof page.properties.icon === 'object' && page.properties.icon?.emoji ? page.properties.icon.emoji : (page.properties.icon || '📄');
  const updatedAt = new Date(page.updatedAt);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <Box
      data-card
      bg="white"
      borderRadius={isMinecraft ? '4px' : 'xl'}
      boxShadow={isMinecraft ? '3px 3px 0px #5D8C3E' : 'md'}
      border={isMinecraft ? '2px solid #8B5A2B' : isPusheen ? '2px solid #D4A574' : '1px solid'}
      borderColor={isMinecraft ? undefined : isPusheen ? undefined : 'gray.200'}
      p={3}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg',
      }}
      onClick={onClick}
      position="relative"
    >
      <HStack mb={1}>
        <Text fontSize="lg">{icon}</Text>
        <Text fontWeight="bold" fontSize="sm" noOfLines={1} flex={1}>
          {title}
        </Text>
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<FiMoreHorizontal />}
            size="xs"
            variant="ghost"
            onClick={(e) => e.stopPropagation()}
          />
          <MenuList>
            <MenuItem icon={<FiTrash2 />} color="red.500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              Delete
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
      <HStack fontSize="xs" color="gray.500">
        <FiClock />
        <Text>{timeAgo}</Text>
        {page.templateCategory && (
          <Badge colorScheme={TEMPLATE_CATEGORY_CONFIG[page.templateCategory as TemplateCategory]?.color || 'gray'} size="sm">
            {TEMPLATE_CATEGORY_CONFIG[page.templateCategory as TemplateCategory]?.emoji} {page.templateCategory}
          </Badge>
        )}
      </HStack>
    </Box>
  );
}

// ============================================================================
// Template Selector Modal
// ============================================================================

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ChildPageTemplate[];
  onSelect: (templateId: string) => void;
  onBlank: () => void;
  isMinecraft: boolean;
  isPusheen: boolean;
  onOpen?: () => void;
}

function TemplateSelector({ isOpen, onClose, templates, onSelect, onBlank, isMinecraft, isPusheen, onOpen }: TemplateSelectorProps) {
  const categories = Object.keys(TEMPLATE_CATEGORY_CONFIG) as TemplateCategory[];

  // Fetch templates when modal opens
  React.useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
    }
  }, [isOpen, onOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius={isMinecraft ? '4px' : '2xl'} maxH="80vh">
        <ModalHeader>
          <HStack>
            <Text fontSize="2xl">✨</Text>
            <Text>Create New Page</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Blank page option */}
            <Box
              p={4}
              bg="gray.50"
              borderRadius={isMinecraft ? '4px' : 'lg'}
              cursor="pointer"
              _hover={{ bg: 'gray.100' }}
              onClick={() => { onBlank(); onClose(); }}
            >
              <HStack>
                <Text fontSize="2xl">📄</Text>
                <Box>
                  <Text fontWeight="bold">Blank Page</Text>
                  <Text fontSize="sm" color="gray.500">Start from scratch</Text>
                </Box>
              </HStack>
            </Box>

            {templates.length > 0 && <Divider />}

            {/* Templates by category */}
            {templates.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Text color="gray.500">Loading templates...</Text>
              </Box>
            ) : (
              categories.map((category) => {
                const categoryTemplates = templates.filter(t => t.category === category);
                if (categoryTemplates.length === 0) return null;

                const config = TEMPLATE_CATEGORY_CONFIG[category];
                return (
                  <Box key={category}>
                    <Text fontWeight="bold" mb={2} color="gray.600">
                      {config.emoji} {config.label}
                    </Text>
                    <SimpleGrid columns={2} spacing={2}>
                      {categoryTemplates.map((template) => (
                        <Box
                          key={template.id}
                          p={3}
                          bg={`${config.color}.50`}
                          borderRadius={isMinecraft ? '4px' : 'lg'}
                          cursor="pointer"
                          _hover={{ bg: `${config.color}.100` }}
                          onClick={() => { onSelect(template.id); onClose(); }}
                        >
                          <HStack>
                            <Text fontSize="xl">{template.icon}</Text>
                            <Box>
                              <Text fontWeight="medium" fontSize="sm">{template.name}</Text>
                              <Text fontSize="xs" color="gray.500" noOfLines={1}>{template.description}</Text>
                            </Box>
                          </HStack>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                );
              })
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// ============================================================================
// Main Workspace Content
// ============================================================================

function WorkspacePageContent() {
  const router = useRouter();
  const toast = useToast();
  const { colors, childExtras, themeId } = useChildTheme();
  const { setContext, setIsOpen, setCustomData, isOpen } = useRightPanel();

  // State
  const [workspace, setWorkspace] = useState<ChildWorkspace | null>(null);
  const [pages, setPages] = useState<ChildBlock[]>([]);
  const [templates, setTemplates] = useState<ChildPageTemplate[]>([]);
  const [selectedPage, setSelectedPage] = useState<ChildBlock | null>(null);
  const [pageBlocks, setPageBlocks] = useState<ChildBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Text selection toolbar (Notion-style)
  const { selection: selectionState, clearSelection, applyFormat } = useTextSelection();

  // Drag and drop sensors - must be at top level, not in render function
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Modals
  const { isOpen: isTemplateOpen, onOpen: onTemplateOpen, onClose: onTemplateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [pageToDelete, setPageToDelete] = useState<ChildBlock | null>(null);

  // Theme
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const getBackgroundImage = () => {
    if (!backgroundImages) return undefined;
    const bgMap: Record<string, string | undefined> = backgroundImages as any;
    return bgMap['workspace'] || backgroundImages.default;
  };
  const backgroundImage = getBackgroundImage();
  const primaryColor = colors?.primary || '#667eea';
  const cardBg = colors?.backgroundSecondary || 'white';
  const isMinecraft = themeId?.includes('minecraft');
  const isPusheen = themeId?.includes('pusheen');

  // Background mode
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');

  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);

  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };

  const bgStyles = getBackgroundStyles(bgMode);

  // Only set context, don't force panel open (let layout handle visibility based on screen size)
  useEffect(() => {
    setContext('child-workspace');
  }, [setContext]);

  // Define createPageFromBuilder before using it in useEffect
  const createPageFromBuilder = useCallback(async (builderResponse: {
    title: string;
    icon: string;
    blocks: Array<{
      type: string;
      content: string;
      properties?: Record<string, any>;
    }>;
  }) => {
    try {
      const res = await fetch('/api/child/workspace?action=from-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(builderResponse),
      });

      if (res.ok) {
        const data = await res.json();
        setPages(prev => [data.page, ...prev]);
        setSelectedPage(data.page);
        setPageBlocks(data.blocks || []);
        toast({
          title: '🤖 Page built!',
          description: 'Your AI-crafted page is ready',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to create page from builder:', error);
      toast({
        title: 'Failed to create page',
        status: 'error',
        duration: 2000,
      });
    }
  }, [toast]);

  // Pass createPageFromBuilder and current page context to right panel via customData
  useEffect(() => {
    setCustomData({
      onPageBuilderCreate: createPageFromBuilder,
      // Current page context for AI agent awareness
      currentPageId: selectedPage?.id || null,
      currentPageTitle: selectedPage?.properties?.title?.[0]?.text || '',
      currentPageIcon: selectedPage?.properties?.icon || '📄',
      currentPageBlocks: pageBlocks,
      // Callback to update the current page (for redesign functionality)
      onPageUpdate: async (updatedBlocks: ChildBlock[], title?: string, icon?: string) => {
        console.log('[Workspace] onPageUpdate called:', { 
          blocksCount: updatedBlocks.length, 
          title, 
          icon,
          pageId: selectedPage?.id 
        });
        
        if (selectedPage) {
          setPageBlocks(updatedBlocks);
          
          // Update the selected page with new title/icon if provided
          if (title || icon) {
            console.log('[Workspace] Updating page title/icon in state');
            const updatedPage = { ...selectedPage };
            if (title && updatedPage.properties?.title) {
              updatedPage.properties.title = [{ text: title, annotations: {} }];
            }
            if (icon && updatedPage.properties) {
              updatedPage.properties.icon = icon;
            }
            setSelectedPage(updatedPage);
            
            // Also update in pages list
            setPages(prevPages => 
              prevPages.map(p => p.id === selectedPage.id ? updatedPage : p)
            );
          }
          
          // Trigger save
          setSaving(true);
          try {
            // Update page properties (title/icon) if provided
            if (title || icon) {
              console.log('[Workspace] Saving page properties to API');
              const updatedProperties = { ...selectedPage.properties };
              if (title) {
                updatedProperties.title = [{ text: title, annotations: {} }];
              }
              if (icon) {
                updatedProperties.icon = icon;
              }
              
              const propsResponse = await fetch(`/api/child/workspace?blockId=${selectedPage.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  properties: updatedProperties,
                }),
              });
              console.log('[Workspace] Properties update response:', propsResponse.status);
            }
            
            // Update page blocks - delete old blocks and create new ones
            console.log('[Workspace] Saving page blocks to API');
            
            // Delete all existing blocks
            for (const block of pageBlocks) {
              if (block.id) {
                await fetch(`/api/child/workspace?blockId=${block.id}&permanent=true`, {
                  method: 'DELETE',
                });
              }
            }
            
            // Create new blocks
            for (let i = 0; i < updatedBlocks.length; i++) {
              const block = updatedBlocks[i];
              await fetch('/api/child/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: block.type,
                  content: block.content,
                  properties: block.properties,
                  parentId: selectedPage.id,
                  position: i,
                }),
              });
            }
            
            console.log('[Workspace] Blocks update complete');
          } catch (error) {
            console.error('Failed to save page updates:', error);
          } finally {
            setSaving(false);
          }
        }
      },
      wordCount: pageBlocks.reduce((acc, block) => {
        const text = block.content?.map(c => c.text).join(' ') || '';
        return acc + text.split(/\s+/).filter(Boolean).length;
      }, 0),
      characterCount: pageBlocks.reduce((acc, block) => {
        const text = block.content?.map(c => c.text).join('') || '';
        return acc + text.length;
      }, 0),
    });
  }, [setCustomData, pageBlocks, selectedPage, createPageFromBuilder]);

  // Fetch workspace data
  useEffect(() => {
    fetchWorkspace();
    fetchTemplates();
  }, []);

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/child/workspace');
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
        const fetchedPages = data.pages || [];
        setPages(fetchedPages);
        
        // If workspace is empty, populate with example pages
        if (fetchedPages.length === 0) {
          await populateExamplePages();
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateExamplePages = async () => {
    try {
      const res = await fetch('/api/child/workspace?action=populate-examples');
      if (res.ok) {
        // Refetch workspace to get the new pages
        const workspaceRes = await fetch('/api/child/workspace');
        if (workspaceRes.ok) {
          const data = await workspaceRes.json();
          setPages(data.pages || []);
        }
      }
    } catch (error) {
      console.error('Failed to populate example pages:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/child/workspace?action=templates');
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched templates:', data.templates);
        setTemplates(data.templates || []);
      } else {
        console.error('Failed to fetch templates, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchPage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/child/workspace?pageId=${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPage(data.page);
        setPageBlocks(data.blocks || []);
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
    }
  };

  // Create page
  const createPage = async (templateId?: string) => {
    try {
      const url = templateId
        ? `/api/child/workspace?action=from-template&templateId=${templateId}`
        : '/api/child/workspace?action=page';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', icon: '📄' }),
      });

      if (res.ok) {
        const data = await res.json();
        setPages(prev => [data.page, ...prev]);
        setSelectedPage(data.page);
        setPageBlocks(data.blocks || []);
        onTemplateClose();
        toast({
          title: '✨ Page created!',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to create page:', error);
      toast({
        title: 'Failed to create page',
        status: 'error',
        duration: 2000,
      });
    }
  };

  // Update block
  const updateBlock = async (blockId: string, content: ChildRichText[], properties?: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, properties }),
      });

      if (res.ok) {
        const data = await res.json();
        setPageBlocks(prev => prev.map(b => b.id === blockId ? data.block : b));
      }
    } catch (error) {
      console.error('Failed to update block:', error);
    } finally {
      setSaving(false);
    }
  };

  // Update page title
  const updatePageTitle = async (title: string) => {
    if (!selectedPage) return;

    try {
      const res = await fetch(`/api/child/workspace?blockId=${selectedPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { ...selectedPage.properties, title: [{ text: title }] },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedPage(data.block);
        setPages(prev => prev.map(p => p.id === selectedPage.id ? data.block : p));
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  // Add block
  const addBlock = async (afterBlockId: string, type: ChildBlockType) => {
    if (!selectedPage) return;

    const afterBlock = pageBlocks.find(b => b.id === afterBlockId);
    const position = afterBlock ? afterBlock.position + 1 : pageBlocks.length;

    try {
      const res = await fetch('/api/child/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: [],
          parentId: selectedPage.id,
          position,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Insert at correct position
        setPageBlocks(prev => {
          const newBlocks = [...prev];
          const insertIndex = prev.findIndex(b => b.id === afterBlockId) + 1;
          newBlocks.splice(insertIndex, 0, data.block);
          return newBlocks;
        });
      }
    } catch (error) {
      console.error('Failed to add block:', error);
    }
  };

  // Delete block
  const deleteBlock = async (blockId: string) => {
    try {
      await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'DELETE',
      });
      setPageBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  // Transform block type (Turn into)
  const transformBlock = async (blockId: string, newType: ChildBlockType) => {
    const block = pageBlocks.find(b => b.id === blockId);
    if (!block || block.type === newType) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: newType,
          content: block.content,
          properties: block.properties,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPageBlocks(prev => prev.map(b => b.id === blockId ? data.block : b));
      }
    } catch (error) {
      console.error('Failed to transform block:', error);
    } finally {
      setSaving(false);
    }
  };

  // Duplicate block
  const duplicateBlock = async (blockId: string) => {
    const block = pageBlocks.find(b => b.id === blockId);
    if (!block || !selectedPage) return;

    const blockIndex = pageBlocks.findIndex(b => b.id === blockId);
    
    try {
      const res = await fetch('/api/child/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: block.type,
          content: block.content,
          properties: block.properties,
          parentId: selectedPage.id,
          position: blockIndex + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Insert duplicated block after the original
        setPageBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks.splice(blockIndex + 1, 0, data.block);
          return newBlocks;
        });
      }
    } catch (error) {
      console.error('Failed to duplicate block:', error);
    }
  };

  // Set block background color
  const setBlockColor = async (blockId: string, color: string) => {
    const block = pageBlocks.find(b => b.id === blockId);
    if (!block) return;

    const newProperties = { ...block.properties, bgColor: color === 'default' ? undefined : color };
    
    // Update locally first
    setPageBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, properties: newProperties } : b
    ));

    // Persist to database
    try {
      await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: newProperties }),
      });
    } catch (error) {
      console.error('Failed to set block color:', error);
    }
  };

  // Add comment to block
  const addBlockComment = async (blockId: string, text: string) => {
    const block = pageBlocks.find(b => b.id === blockId);
    if (!block) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      text,
      author: 'Me',
      createdAt: new Date().toISOString(),
    };

    const existingComments = block.properties?.comments || [];
    const newProperties = { ...block.properties, comments: [...existingComments, newComment] };
    
    // Update locally first
    setPageBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, properties: newProperties } : b
    ));

    // Persist to database
    try {
      await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: newProperties }),
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Delete comment from block
  const deleteBlockComment = async (blockId: string, commentId: string) => {
    const block = pageBlocks.find(b => b.id === blockId);
    if (!block) return;

    const existingComments = block.properties?.comments || [];
    const newComments = existingComments.filter((c: any) => c.id !== commentId);
    const newProperties = { ...block.properties, comments: newComments };
    
    // Update locally first
    setPageBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, properties: newProperties } : b
    ));

    // Persist to database
    try {
      await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: newProperties }),
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Handle drag end for reordering blocks
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = pageBlocks.findIndex(b => b.id === active.id);
    const newIndex = pageBlocks.findIndex(b => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Update locally first for instant feedback
    const newBlocks = arrayMove(pageBlocks, oldIndex, newIndex);
    setPageBlocks(newBlocks);

    // Persist to database
    setSaving(true);
    try {
      // Update positions for all affected blocks
      for (let i = Math.min(oldIndex, newIndex); i <= Math.max(oldIndex, newIndex); i++) {
        await fetch(`/api/child/workspace?blockId=${newBlocks[i].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i }),
        });
      }
    } catch (error) {
      console.error('Failed to reorder blocks:', error);
      // Revert on error
      setPageBlocks(pageBlocks);
    } finally {
      setSaving(false);
    }
  };

  // Move block up or down
  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = pageBlocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= pageBlocks.length) return;

    // Swap positions locally first for instant feedback
    const newBlocks = [...pageBlocks];
    const [movedBlock] = newBlocks.splice(currentIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);
    setPageBlocks(newBlocks);

    // Update positions in database
    setSaving(true);
    try {
      // Update the moved block's position
      await fetch(`/api/child/workspace?blockId=${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: newIndex }),
      });
      
      // Update the swapped block's position
      const swappedBlock = pageBlocks[newIndex];
      await fetch(`/api/child/workspace?blockId=${swappedBlock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: currentIndex }),
      });
    } catch (error) {
      console.error('Failed to move block:', error);
      // Revert on error
      setPageBlocks(pageBlocks);
    } finally {
      setSaving(false);
    }
  };

  // Delete page
  const deletePage = async () => {
    if (!pageToDelete) return;

    try {
      await fetch(`/api/child/workspace?blockId=${pageToDelete.id}`, {
        method: 'DELETE',
      });
      setPages(prev => prev.filter(p => p.id !== pageToDelete.id));
      if (selectedPage?.id === pageToDelete.id) {
        setSelectedPage(null);
        setPageBlocks([]);
      }
      onDeleteClose();
      setPageToDelete(null);
      toast({
        title: '🗑️ Page deleted',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  // Filter pages by search
  const filteredPages = pages.filter(page => {
    const title = page.properties.title?.[0]?.text || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Render page list view
  const renderPageList = () => (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <Box
        data-card
        bg={cardBg}
        borderRadius={isMinecraft ? '4px' : '2xl'}
        p={4}
        boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
        border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #D4A574' : 'none'}
      >
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Text fontSize="3xl">📁</Text>
            <VStack align="start" spacing={0}>
              <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
                My Workspace
              </Text>
              <Text fontSize="sm" color="gray.500">
                {pages.length} pages
              </Text>
            </VStack>
          </HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={onTemplateOpen}
            borderRadius={isMinecraft ? '4px' : 'full'}
          >
            New Page
          </Button>
        </HStack>

        {/* Search and view toggle */}
        <HStack>
          <InputGroup flex={1}>
            <InputLeftElement>
              <FiSearch color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius={isMinecraft ? '4px' : 'full'}
            />
          </InputGroup>
          <IconButton
            aria-label="Grid view"
            icon={<FiGrid />}
            variant={viewMode === 'grid' ? 'solid' : 'ghost'}
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={() => setViewMode('grid')}
          />
          <IconButton
            aria-label="List view"
            icon={<FiList />}
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={() => setViewMode('list')}
          />
        </HStack>
      </Box>

      {/* Pages */}
      {loading ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color={primaryColor} />
          <Text mt={2} color="gray.500">Loading your workspace...</Text>
        </Box>
      ) : filteredPages.length === 0 ? (
        <Box
          data-card
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={6}
          textAlign="center"
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'lg'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #D4A574' : 'none'}
        >
          <Text fontSize="2xl" mb={2}>📝</Text>
          <Text fontWeight="bold" fontSize="md" mb={2}>No pages yet!</Text>
          <Text color="gray.500" fontSize="sm" mb={3}>Create your first page to get started</Text>
          <Button
            leftIcon={<FiPlus />}
            size="sm"
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={onTemplateOpen}
          >
            Create Page
          </Button>
        </Box>
      ) : viewMode === 'grid' ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filteredPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onClick={() => fetchPage(page.id)}
              onDelete={() => {
                setPageToDelete(page);
                onDeleteOpen();
              }}
              isMinecraft={isMinecraft || false}
              isPusheen={isPusheen || false}
              primaryColor={primaryColor}
            />
          ))}
        </SimpleGrid>
      ) : (
        <VStack spacing={2} align="stretch">
          {filteredPages.map((page) => (
            <Box
              key={page.id}
              data-card
              bg={cardBg}
              p={2}
              borderRadius={isMinecraft ? '4px' : 'lg'}
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => fetchPage(page.id)}
            >
              <HStack>
                <Text fontSize="md">{typeof page.properties.icon === 'object' && page.properties.icon?.emoji ? page.properties.icon.emoji : (page.properties.icon || '📄')}</Text>
                <Text fontWeight="medium" fontSize="sm" flex={1}>{page.properties.title?.[0]?.text || 'Untitled'}</Text>
                <Text fontSize="xs" color="gray.500">{getTimeAgo(new Date(page.updatedAt))}</Text>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  );

  // Render page editor
  const renderPageEditor = () => {
    if (!selectedPage) return null;

    const title = selectedPage.properties.title?.[0]?.text || 'Untitled';
    const icon = typeof selectedPage.properties.icon === 'object' && selectedPage.properties.icon?.emoji ? selectedPage.properties.icon.emoji : (selectedPage.properties.icon || '📄');

    return (
      <VStack spacing={2} align="stretch">
        {/* Page header */}
        <Box
          data-card
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={2}
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'md'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #D4A574' : 'none'}
        >
          <HStack mb={1}>
            <IconButton
              aria-label="Back"
              icon={<FiChevronLeft />}
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPage(null);
                setPageBlocks([]);
              }}
            />
            <Text fontSize="md">{icon}</Text>
            <Input
              value={title}
              onChange={(e) => updatePageTitle(e.target.value)}
              variant="unstyled"
              fontSize="md"
              fontWeight="bold"
              placeholder="Untitled"
            />
            <Spacer />
            {saving && <Spinner size="sm" />}
          </HStack>
        </Box>

        {/* Page content */}
        <Box
          data-card
          bg={cardBg}
          borderRadius={isMinecraft ? '4px' : '2xl'}
          p={3}
          minH="200px"
          boxShadow={isMinecraft ? '4px 4px 0px #5D8C3E' : 'md'}
          border={isMinecraft ? '3px solid #8B5A2B' : isPusheen ? '2px solid #D4A574' : 'none'}
        >
          <VStack spacing={1} align="stretch">
            {pageBlocks.length === 0 ? (
              <Box
                p={4}
                color="gray.400"
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                borderRadius="md"
                onClick={() => addBlock('', 'paragraph')}
              >
                <Text>Click here to start writing...</Text>
              </Box>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={pageBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {pageBlocks.map((block, index) => (
                    <SortableBlockWrapper
                      key={block.id}
                      block={block}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                      onAddBlock={addBlock}
                      onTransformBlock={transformBlock}
                      onMoveBlock={moveBlock}
                      onDuplicateBlock={duplicateBlock}
                      onSetBlockColor={setBlockColor}
                      onAddComment={addBlockComment}
                      onDeleteComment={deleteBlockComment}
                      isMinecraft={isMinecraft || false}
                      isPusheen={isPusheen || false}
                      primaryColor={primaryColor}
                      index={index}
                      totalBlocks={pageBlocks.length}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {/* Add block button at bottom */}
            <Box pt={4}>
              <Menu>
                <MenuButton
                  as={Button}
                  leftIcon={<FiPlus />}
                  variant="ghost"
                  size="sm"
                  color="gray.400"
                  _hover={{ color: primaryColor }}
                >
                  Add block
                </MenuButton>
                <MenuList fontSize="sm">
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'paragraph')}>📝 Text</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'heading_1')}>📌 Big Title</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'heading_2')}>📎 Medium Title</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'bulleted_list')}>• Bullet List</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'numbered_list')}>1️⃣ Numbered List</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'to_do')}>☑️ Checklist</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'callout')}>💡 Callout</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'quote')}>💬 Quote</MenuItem>
                  <MenuItem onClick={() => addBlock(pageBlocks[pageBlocks.length - 1]?.id || '', 'divider')}>➖ Divider</MenuItem>
                </MenuList>
              </Menu>
            </Box>
          </VStack>
        </Box>
      </VStack>
    );
  };

  return (
    <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box
        minH="calc(100vh - 70px)"
        position="relative"
        bg={colors?.background || '#f0f4ff'}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundAttachment={bgStyles.backgroundAttachment}
      >
        {/* Overlay */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(255, 255, 255, 0.85)"
        />

        <Box position="relative" zIndex={1}>
          <Container maxW="2xl" py={2}>
            {selectedPage ? renderPageEditor() : renderPageList()}
          </Container>
        </Box>

        {/* Text Selection Toolbar - Notion-style */}
        {selectionState.isActive && (
          <FormatToolbar
            position={selectionState.position}
            onFormat={(format, value) => {
              applyFormat(format, value);
              clearSelection();
            }}
            onClose={clearSelection}
          />
        )}
      </Box>

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={isTemplateOpen}
        onClose={onTemplateClose}
        templates={templates}
        onSelect={(templateId) => createPage(templateId)}
        onBlank={() => createPage()}
        isMinecraft={isMinecraft || false}
        isPusheen={isPusheen || false}
        onOpen={fetchTemplates}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="2xl" mx={4}>
          <ModalBody p={6} textAlign="center">
            <VStack spacing={4}>
              <Box
                w="80px"
                h="80px"
                borderRadius="full"
                bg="red.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="4xl">🗑️</Text>
              </Box>
              <Text fontSize="xl" fontWeight="bold">Delete this page?</Text>
              {pageToDelete && (
                <HStack>
                  <Text fontSize="xl">{typeof pageToDelete.properties.icon === 'object' && pageToDelete.properties.icon?.emoji ? pageToDelete.properties.icon.emoji : (pageToDelete.properties.icon || '📄')}</Text>
                  <Text fontWeight="medium">{pageToDelete.properties.title?.[0]?.text || 'Untitled'}</Text>
                </HStack>
              )}
              <Text color="gray.500" fontSize="sm">This will remove the page forever.</Text>
              <HStack spacing={3} w="full" pt={2}>
                <Button flex={1} variant="outline" borderRadius="full" onClick={onDeleteClose}>
                  Keep it
                </Button>
                <Button flex={1} colorScheme="red" borderRadius="full" onClick={deletePage}>
                  Delete
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </BackgroundContextMenu>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeAgo(date: Date): string {
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
}

// ============================================================================
// Page Export
// ============================================================================

export default function ChildWorkspacePage() {
  return (
    <ChildDashboardLayout pageType="workspace">
      <StudentProgressProvider>
        <WorkspacePageContent />
      </StudentProgressProvider>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/workspace',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
