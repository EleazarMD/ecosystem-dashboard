/**
 * SlashCommandMenu - Notion-style slash command menu
 * Appears when user types "/" to insert blocks
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Input,
  Kbd,
} from '@chakra-ui/react';
import {
  FiType, FiList, FiCheckSquare, FiCode,
  FiMessageSquare, FiTable, FiDatabase, FiMinus,
  FiFileText, FiBarChart2, FiPieChart, FiTrendingUp,
  FiImage, FiVideo, FiFile
} from 'react-icons/fi';
import { GlassMenu } from '../design-system/GlassComponents';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: any;
  blockType: string;
  category: 'basic' | 'media' | 'database' | 'advanced';
}

interface SlashCommandMenuProps {
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const COMMANDS: SlashCommand[] = [
  // Basic Blocks
  { id: 'text', label: 'Text', description: 'Just start writing with plain text', icon: FiType, blockType: 'paragraph', category: 'basic' },
  { id: 'h1', label: 'Heading 1', description: 'Big section heading', icon: FiFileText, blockType: 'heading_1', category: 'basic' },
  { id: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: FiFileText, blockType: 'heading_2', category: 'basic' },
  { id: 'h3', label: 'Heading 3', description: 'Small section heading', icon: FiFileText, blockType: 'heading_3', category: 'basic' },
  { id: 'bullet', label: 'Bulleted list', description: 'Create a simple bulleted list', icon: FiList, blockType: 'bulleted_list', category: 'basic' },
  { id: 'numbered', label: 'Numbered list', description: 'Create a list with numbering', icon: FiList, blockType: 'numbered_list', category: 'basic' },
  { id: 'todo', label: 'To-do list', description: 'Track tasks with a to-do list', icon: FiCheckSquare, blockType: 'to_do', category: 'basic' },
  { id: 'quote', label: 'Quote', description: 'Capture a quote', icon: FiMessageSquare, blockType: 'quote', category: 'basic' },
  { id: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: FiMinus, blockType: 'divider', category: 'basic' },
  { id: 'code', label: 'Code', description: 'Capture a code snippet', icon: FiCode, blockType: 'code', category: 'basic' },

  // Page Actions
  { id: 'add-cover', label: 'Add Cover', description: 'Add a cover image to the page', icon: FiImage, blockType: 'action_add_cover', category: 'basic' },

  // Media Blocks
  { id: 'image', label: 'Image', description: 'Upload or embed an image', icon: FiImage, blockType: 'image', category: 'media' },
  { id: 'video', label: 'Video', description: 'Embed a video', icon: FiVideo, blockType: 'video', category: 'media' },
  { id: 'file', label: 'File', description: 'Upload or embed a file', icon: FiFile, blockType: 'file', category: 'media' },
  { id: 'embed', label: 'Embed', description: 'Embed external content (YouTube, Twitter, etc.)', icon: FiCode, blockType: 'embed', category: 'media' },

  // Database Blocks
  { id: 'table', label: 'Table', description: 'Add a simple table', icon: FiTable, blockType: 'table', category: 'database' },
  { id: 'database-inline', label: 'Database - Inline', description: 'Create a database inline', icon: FiDatabase, blockType: 'database_inline', category: 'database' },
  { id: 'database-full', label: 'Database - Full page', description: 'Create a full page database', icon: FiDatabase, blockType: 'database_full', category: 'database' },

  // Chart Blocks
  { id: 'static-chart', label: 'Static Chart', description: 'Create a static chart from data (PNG/SVG)', icon: FiBarChart2, blockType: 'static_chart', category: 'media' },
  { id: 'plotly-chart', label: 'Interactive Chart', description: 'Create an interactive Plotly chart', icon: FiPieChart, blockType: 'plotly_chart', category: 'media' },
  { id: 'data-story', label: 'Data Story', description: 'Create a multi-chart narrative dashboard', icon: FiTrendingUp, blockType: 'data_story', category: 'advanced' },
];

export function SlashCommandMenu({ onSelect, onClose, position }: SlashCommandMenuProps) {
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.active');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('brand.primary');

  // Filter commands
  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <GlassMenu
      ref={menuRef}
      position="fixed"
      top={`${position.y}px`}
      left={`${position.x}px`}
      w="340px"
      maxH="420px"
      zIndex={1000}
      display="flex"
      flexDirection="column"
    >
      {/* Search Input */}
      <Box p={3} borderBottomWidth="1px" borderColor={borderColor}>
        <Input
          placeholder="Filter blocks..."
          size="sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoFocus
          variant="unstyled"
          px={2}
          fontSize="sm"
          _placeholder={{ color: mutedColor }}
        />
      </Box>

      {/* Commands List */}
      <VStack
        align="stretch"
        spacing={0}
        overflowY="auto"
        flex={1}
        py={1}
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '24px',
          },
        }}
      >
        {filteredCommands.length > 0 ? (
          <>
            <Text
              fontSize="xs"
              fontWeight="600"
              color={mutedColor}
              px={3}
              py={2}
              textTransform="uppercase"
              letterSpacing="wider"
            >
              Basic Blocks
            </Text>
            {filteredCommands.map((command, index) => (
              <HStack
                key={command.id}
                px={3}
                py={2}
                spacing={3}
                bg={index === selectedIndex ? selectedBg : 'transparent'}
                _hover={{ bg: hoverBg }}
                cursor="pointer"
                onClick={() => onSelect(command)}
                transition="background 0.1s ease"
              >
                <Box
                  p={1.5}
                  borderRadius="md"
                  bg={useSemanticToken('surface.elevated')}
                  boxShadow="sm"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Icon as={command.icon} boxSize={4} color={textColor} />
                </Box>
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="500" color={textColor}>
                    {command.label}
                  </Text>
                  <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                    {command.description}
                  </Text>
                </VStack>
                {index === selectedIndex && (
                  <Kbd fontSize="xs" opacity={0.6}>↵</Kbd>
                )}
              </HStack>
            ))}
          </>
        ) : (
          <Box p={6} textAlign="center">
            <Text fontSize="sm" color={mutedColor}>
              No blocks found
            </Text>
          </Box>
        )}
      </VStack>
    </GlassMenu>
  );
}

export default SlashCommandMenu;
