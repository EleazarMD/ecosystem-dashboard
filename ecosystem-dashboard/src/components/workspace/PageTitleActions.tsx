/**
 * Page Title Actions Component
 * Displays "Add icon" and "Add cover" buttons on hover (Notion-style)
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  Text,
} from '@chakra-ui/react';
import { FiImage, FiSmile } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PageTitleActionsProps {
  pageIcon?: string;
  onAddIcon?: () => void;
  onAddCover?: () => void;
  showActions?: boolean;
}

export function PageTitleActions({
  pageIcon,
  onAddIcon,
  onAddCover,
  showActions = true,
}: PageTitleActionsProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!showActions) return null;

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      mb={2}
    >
      <HStack
        spacing={2}
        opacity={isHovered ? 1 : 0}
        transition="opacity 0.2s"
        height="28px"
      >
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Icon as={FiSmile} boxSize={4} />}
          onClick={onAddIcon}
          fontSize="xs"
          color={useSemanticToken('text.secondary')}
          _hover={{ bg: 'gray.100', color: 'gray.700' }}
          height="28px"
          px={2}
        >
          Add icon
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Icon as={FiImage} boxSize={4} />}
          onClick={onAddCover}
          fontSize="xs"
          color={useSemanticToken('text.secondary')}
          _hover={{ bg: 'gray.100', color: 'gray.700' }}
          height="28px"
          px={2}
        >
          Add cover
        </Button>
      </HStack>
    </Box>
  );
}
