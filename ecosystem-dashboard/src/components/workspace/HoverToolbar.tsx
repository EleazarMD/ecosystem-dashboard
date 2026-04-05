/**
 * HoverToolbar - Notion-style floating toolbar for text formatting
 * Appears when text is selected
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  Divider,
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiUnderline,
  FiLink,
  FiType,
} from 'react-icons/fi';

interface HoverToolbarProps {
  onFormat: (format: 'bold' | 'italic' | 'code' | 'underline' | 'link') => void;
  position: { x: number; y: number };
  isVisible: boolean;
}

export function HoverToolbar({ onFormat, position, isVisible }: HoverToolbarProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      top={`${position.y}px`}
      left={`${position.x}px`}
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="lg"
      zIndex={1000}
      transform="translateY(-100%)"
      mt={-2}
    >
      <HStack spacing={0} p={1}>
        <Tooltip label="Bold (⌘B)" placement="top">
          <IconButton
            aria-label="Bold"
            icon={<FiBold />}
            size="sm"
            variant="ghost"
            onClick={() => onFormat('bold')}
          />
        </Tooltip>

        <Tooltip label="Italic (⌘I)" placement="top">
          <IconButton
            aria-label="Italic"
            icon={<FiItalic />}
            size="sm"
            variant="ghost"
            onClick={() => onFormat('italic')}
          />
        </Tooltip>

        <Tooltip label="Code (⌘`)" placement="top">
          <IconButton
            aria-label="Code"
            icon={<FiCode />}
            size="sm"
            variant="ghost"
            onClick={() => onFormat('code')}
          />
        </Tooltip>

        <Divider orientation="vertical" h="24px" mx={1} />

        <Tooltip label="Link" placement="top">
          <IconButton
            aria-label="Link"
            icon={<FiLink />}
            size="sm"
            variant="ghost"
            onClick={() => onFormat('link')}
          />
        </Tooltip>

        <Tooltip label="Turn into" placement="top">
          <IconButton
            aria-label="Turn into"
            icon={<FiType />}
            size="sm"
            variant="ghost"
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}

export default HoverToolbar;
