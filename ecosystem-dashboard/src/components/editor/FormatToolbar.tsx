/**
 * FormatToolbar - Notion-style floating toolbar on text selection
 * Shows formatting options when text is selected
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  Divider,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiCode,
  FiLink,
  FiType,
  FiMoreHorizontal,
} from 'react-icons/fi';
import { RiStrikethrough } from 'react-icons/ri';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface FormatToolbarProps {
  position: { x: number; y: number };
  onFormat: (format: FormatType, value?: string) => void;
  onClose: () => void;
}

export type FormatType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link' | 'color' | 'backgroundColor';

const TEXT_COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Gray', value: '#9B9A97' },
  { name: 'Brown', value: '#64473A' },
  { name: 'Orange', value: '#D9730D' },
  { name: 'Yellow', value: '#DFAB01' },
  { name: 'Green', value: '#0F7B6C' },
  { name: 'Blue', value: '#0B6E99' },
  { name: 'Purple', value: '#6940A5' },
  { name: 'Pink', value: '#AD1A72' },
  { name: 'Red', value: '#E03E3E' },
];

const BACKGROUND_COLORS = [
  { name: 'Default', value: 'transparent' },
  { name: 'Gray', value: 'rgba(155, 154, 151, 0.4)' },
  { name: 'Brown', value: 'rgba(100, 71, 58, 0.4)' },
  { name: 'Orange', value: 'rgba(217, 115, 13, 0.4)' },
  { name: 'Yellow', value: 'rgba(223, 171, 1, 0.4)' },
  { name: 'Green', value: 'rgba(15, 123, 108, 0.4)' },
  { name: 'Blue', value: 'rgba(11, 110, 153, 0.4)' },
  { name: 'Purple', value: 'rgba(105, 64, 165, 0.4)' },
  { name: 'Pink', value: 'rgba(173, 26, 114, 0.4)' },
  { name: 'Red', value: 'rgba(224, 62, 62, 0.4)' },
];

export function FormatToolbar({ position, onFormat, onClose }: FormatToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const shadowColor = 'rgba(0, 0, 0, 0.15)';

  const handleFormat = (format: FormatType, value?: string) => {
    onFormat(format, value);
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      onFormat('link', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  return (
    <Box
      position="fixed"
      top={`${position.y - 50}px`}
      left={`${position.x}px`}
      zIndex={1000}
      bg={bg}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      boxShadow={`0 4px 12px ${shadowColor}`}
      p={1}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <HStack spacing={0} divider={<Divider orientation="vertical" h="20px" />}>
        {/* Text formatting */}
        <HStack spacing={0}>
          <Tooltip label="Bold (⌘B)" placement="top" openDelay={500}>
            <IconButton
              icon={<FiBold />}
              aria-label="Bold"
              size="sm"
              variant="ghost"
              onClick={() => handleFormat('bold')}
            />
          </Tooltip>
          
          <Tooltip label="Italic (⌘I)" placement="top" openDelay={500}>
            <IconButton
              icon={<FiItalic />}
              aria-label="Italic"
              size="sm"
              variant="ghost"
              onClick={() => handleFormat('italic')}
            />
          </Tooltip>
          
          <Tooltip label="Underline (⌘U)" placement="top" openDelay={500}>
            <IconButton
              icon={<FiUnderline />}
              aria-label="Underline"
              size="sm"
              variant="ghost"
              onClick={() => handleFormat('underline')}
            />
          </Tooltip>
          
          <Tooltip label="Strikethrough (⌘⇧X)" placement="top" openDelay={500}>
            <IconButton
              icon={<RiStrikethrough />}
              aria-label="Strikethrough"
              size="sm"
              variant="ghost"
              onClick={() => handleFormat('strikethrough')}
            />
          </Tooltip>
          
          <Tooltip label="Code (⌘E)" placement="top" openDelay={500}>
            <IconButton
              icon={<FiCode />}
              aria-label="Code"
              size="sm"
              variant="ghost"
              onClick={() => handleFormat('code')}
            />
          </Tooltip>
        </HStack>

        {/* Link */}
        <Popover
          isOpen={showLinkInput}
          onOpen={() => setShowLinkInput(true)}
          onClose={() => setShowLinkInput(false)}
          placement="bottom"
        >
          <PopoverTrigger>
            <IconButton
              icon={<FiLink />}
              aria-label="Link"
              size="sm"
              variant="ghost"
            />
          </PopoverTrigger>
          <PopoverContent w="300px">
            <PopoverBody>
              <HStack>
                <input
                  type="url"
                  placeholder="Paste or type a link..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLinkSubmit();
                    if (e.key === 'Escape') setShowLinkInput(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleLinkSubmit}
                  style={{
                    padding: '4px 12px',
                    background: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Link
                </button>
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {/* Text color */}
        <Popover placement="bottom">
          <PopoverTrigger>
            <IconButton
              icon={<FiType />}
              aria-label="Text color"
              size="sm"
              variant="ghost"
            />
          </PopoverTrigger>
          <PopoverContent w="280px">
            <PopoverBody p={3}>
              <Box mb={3}>
                <Box fontSize="xs" fontWeight="600" mb={2} color={useSemanticToken('text.secondary')}>
                  COLOR
                </Box>
                <SimpleGrid columns={5} spacing={2}>
                  {TEXT_COLORS.map((color) => (
                    <Tooltip key={color.name} label={color.name} placement="top">
                      <Box
                        w="40px"
                        h="32px"
                        borderRadius="md"
                        border="1px solid"
                        borderColor={useSemanticToken('border.default')}
                        cursor="pointer"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="lg"
                        fontWeight="600"
                        color={color.value}
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => handleFormat('color', color.value)}
                      >
                        A
                      </Box>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>
              
              <Box>
                <Box fontSize="xs" fontWeight="600" mb={2} color={useSemanticToken('text.secondary')}>
                  BACKGROUND
                </Box>
                <SimpleGrid columns={5} spacing={2}>
                  {BACKGROUND_COLORS.map((color) => (
                    <Tooltip key={color.name} label={`${color.name} background`} placement="top">
                      <Box
                        w="40px"
                        h="32px"
                        borderRadius="md"
                        border="1px solid"
                        borderColor={useSemanticToken('border.default')}
                        cursor="pointer"
                        bg={color.value}
                        _hover={{ opacity: 0.8 }}
                        onClick={() => handleFormat('backgroundColor', color.value)}
                      />
                    </Tooltip>
                  ))}
                </SimpleGrid>
              </Box>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {/* More options */}
        <Tooltip label="More options" placement="top" openDelay={500}>
          <IconButton
            icon={<FiMoreHorizontal />}
            aria-label="More"
            size="sm"
            variant="ghost"
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
