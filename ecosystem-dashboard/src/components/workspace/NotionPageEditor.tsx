/**
 * NotionPageEditor - Complete Notion-style page editor
 * Features: Block editing, hover menus, slash commands, inline formatting
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiMenu,
  FiSmile,
} from 'react-icons/fi';
import { SlashCommandMenu, SlashCommand } from './SlashCommandMenu';
import { HoverToolbar } from './HoverToolbar';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Block {
  id: string;
  type: string;
  content: string;
  properties?: any;
}

interface NotionPageEditorProps {
  pageId: string;
  title: string;
  blocks: Block[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
  onSave: () => void;
}

export function NotionPageEditor({
  pageId,
  title,
  blocks: initialBlocks,
  onTitleChange,
  onBlocksChange,
  onSave,
}: NotionPageEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [showHoverToolbar, setShowHoverToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Add block after current
  const addBlock = (afterId?: string, blockType: string = 'paragraph') => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: blockType,
      content: '',
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      onBlocksChange(newBlocks);
    } else {
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      onBlocksChange(newBlocks);
    }

    // Focus new block
    setTimeout(() => {
      setFocusedBlockId(newBlock.id);
    }, 10);
  };

  // Handle slash command
  const handleSlashCommand = (command: SlashCommand) => {
    if (focusedBlockId) {
      const blockIndex = blocks.findIndex(b => b.id === focusedBlockId);
      if (blockIndex >= 0) {
        const newBlocks = [...blocks];
        newBlocks[blockIndex] = {
          ...newBlocks[blockIndex],
          type: command.blockType,
        };
        setBlocks(newBlocks);
        onBlocksChange(newBlocks);
      }
    }
    setShowSlashMenu(false);
  };

  // Handle block content change
  const handleBlockChange = (blockId: string, content: string) => {
    const newBlocks = blocks.map(b =>
      b.id === blockId ? { ...b, content } : b
    );
    setBlocks(newBlocks);
    onBlocksChange(newBlocks);

    // Check for slash command trigger
    if (content.endsWith('/')) {
      const blockElement = document.getElementById(`block-${blockId}`);
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect();
        setSlashMenuPosition({
          x: rect.left,
          y: rect.bottom,
        });
        setShowSlashMenu(true);
      }
    }
  };

  // Handle text formatting
  const handleFormat = (format: string) => {
    console.log('Format:', format);
    // TODO: Implement text formatting
    setShowHoverToolbar(false);
  };

  // Render block based on type
  const renderBlock = (block: Block, index: number) => {
    const isHovered = hoveredBlockId === block.id;
    const commonProps = {
      id: `block-${block.id}`,
      placeholder: getPlaceholder(block.type),
      value: block.content,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleBlockChange(block.id, e.target.value),
      onFocus: () => setFocusedBlockId(block.id),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addBlock(block.id);
        }
        if (e.key === 'Backspace' && block.content === '') {
          e.preventDefault();
          // Delete block if empty
          if (blocks.length > 1) {
            const newBlocks = blocks.filter(b => b.id !== block.id);
            setBlocks(newBlocks);
            onBlocksChange(newBlocks);
          }
        }
      },
      style: { 
        border: 'none', 
        outline: 'none', 
        width: '100%',
        background: 'transparent',
        padding: '4px 0',
        fontFamily: 'inherit',
        color: textColor,
      },
    };

    let blockElement;
    switch (block.type) {
      case 'heading_1':
        blockElement = <input {...commonProps} style={{ ...commonProps.style, fontSize: '2em', fontWeight: 'bold' }} />;
        break;
      case 'heading_2':
        blockElement = <input {...commonProps} style={{ ...commonProps.style, fontSize: '1.5em', fontWeight: 'bold' }} />;
        break;
      case 'heading_3':
        blockElement = <input {...commonProps} style={{ ...commonProps.style, fontSize: '1.25em', fontWeight: 'bold' }} />;
        break;
      case 'quote':
        blockElement = (
          <Box borderLeftWidth="3px" borderColor="gray.400" pl={4}>
            <input {...commonProps} style={{ ...commonProps.style, fontStyle: 'italic' }} />
          </Box>
        );
        break;
      case 'code':
        blockElement = (
          <Box bg={useSemanticToken('surface.base')} p={2} borderRadius="md" fontFamily="monospace">
            <textarea {...commonProps} rows={3} style={{ ...commonProps.style, fontFamily: 'monospace', fontSize: '0.9em' }} />
          </Box>
        );
        break;
      case 'table':
        // Import and render TableBlock
        const TableBlock = require('./blocks/TableBlock').default;
        blockElement = (
          <TableBlock
            blockId={block.id}
            columns={block.properties?.columns || ['Column 1', 'Column 2', 'Column 3']}
            rows={block.properties?.rows || []}
            onUpdate={(data) => {
              // Update block properties with table data
              const updatedBlock = { ...block, properties: { ...block.properties, ...data } };
              const newBlocks = blocks.map(b => b.id === block.id ? updatedBlock : b);
              setBlocks(newBlocks);
              onBlocksChange(newBlocks);
            }}
          />
        );
        break;
      case 'database_inline':
      case 'database_full_page':
        // Import and render DatabaseBlock
        const DatabaseBlock = require('./blocks/DatabaseBlock').DatabaseBlock;
        blockElement = (
          <DatabaseBlock
            blockId={block.id}
            inline={block.type === 'database_inline'}
          />
        );
        break;
      default:
        blockElement = <input {...commonProps} />;
    }

    return (
      <HStack
        key={block.id}
        w="full"
        spacing={1}
        position="relative"
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
        py={1}
      >
        {/* Hover Actions - Left Side */}
        <Box
          position="absolute"
          left="-60px"
          opacity={isHovered ? 1 : 0}
          transition="opacity 0.2s"
        >
          <HStack spacing={1}>
            <Tooltip label="Add block" placement="top">
              <IconButton
                aria-label="Add block"
                icon={<FiPlus />}
                size="xs"
                variant="ghost"
                onClick={() => addBlock(block.id)}
              />
            </Tooltip>
            <Tooltip label="Drag to reorder" placement="top">
              <IconButton
                aria-label="Drag"
                icon={<FiMenu />}
                size="xs"
                variant="ghost"
                cursor="grab"
              />
            </Tooltip>
          </HStack>
        </Box>

        {/* Block Content */}
        <Box flex={1}>
          {blockElement}
        </Box>

        {/* Hover Actions - Right Side */}
        <Box
          position="absolute"
          right="-40px"
          opacity={isHovered ? 1 : 0}
          transition="opacity 0.2s"
        >
          <Tooltip label="More" placement="top">
            <IconButton
              aria-label="More"
              icon={<FiMoreVertical />}
              size="xs"
              variant="ghost"
            />
          </Tooltip>
        </Box>
      </HStack>
    );
  };

  return (
    <Box maxW="900px" mx="auto" p={8}>
      {/* Page Icon & Title */}
      <VStack align="stretch" spacing={2} mb={8}>
        <HStack spacing={2}>
          <IconButton
            aria-label="Add icon"
            icon={<FiSmile />}
            variant="ghost"
            size="sm"
          />
        </HStack>
        
        <Input
          placeholder="Untitled"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          fontSize="3xl"
          fontWeight="bold"
          variant="unstyled"
          _placeholder={{ color: mutedColor }}
        />

        <Text fontSize="sm" color={mutedColor}>
          Click to edit title, press / for commands
        </Text>
      </VStack>

      {/* Blocks */}
      <VStack align="stretch" spacing={0} position="relative" pl="60px" pr="40px">
        {blocks.map((block, index) => renderBlock(block, index))}

        {/* Add first block if empty */}
        {blocks.length === 0 && (
          <HStack
            py={2}
            cursor="text"
            onClick={() => addBlock()}
          >
            <Text color={mutedColor}>
              Click to start writing or press / for commands...
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu
          position={slashMenuPosition}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}

      {/* Hover Toolbar */}
      <HoverToolbar
        position={toolbarPosition}
        isVisible={showHoverToolbar}
        onFormat={handleFormat}
      />
    </Box>
  );
}

// Helper to get placeholder text for block types
function getPlaceholder(blockType: string): string {
  switch (blockType) {
    case 'heading_1':
      return 'Heading 1';
    case 'heading_2':
      return 'Heading 2';
    case 'heading_3':
      return 'Heading 3';
    case 'quote':
      return 'Empty quote';
    case 'code':
      return '// Code';
    default:
      return "Type '/' for commands";
  }
}

export default NotionPageEditor;
