/**
 * BlockHandle - Notion-style 6-dot drag handle
 * Appears on hover, triggers block menu
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiPlus, FiMenu } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BlockHandleProps {
  blockId: string;
  isVisible: boolean;
  onMenuClick: (event: React.MouseEvent) => void;
  onAddClick?: () => void;
  onDragStart?: (event: React.DragEvent) => void;
}

const MotionHStack = motion(HStack);

export const BlockHandle: React.FC<BlockHandleProps> = ({
  blockId,
  isVisible,
  onMenuClick,
  onAddClick,
  onDragStart,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Modern minimal colors
  const handleColor = 'gray.400';
  const handleHoverColor = 'gray.500';
  const bgHover = useSemanticToken('surface.hover');

  return (
    <MotionHStack
      position="absolute"
      left="-48px" // Slightly more space
      top="2px"
      spacing={0}
      initial={false}
      animate={{
        opacity: isVisible || isDragging ? 1 : 0,
        x: isVisible || isDragging ? 0 : -5
      }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* Add block button */}
      <Tooltip label="Add block below" placement="top" hasArrow fontSize="xs" openDelay={500}>
        <IconButton
          aria-label="Add block"
          icon={<FiPlus size={16} />}
          size="xs"
          variant="ghost"
          color={handleColor}
          _hover={{
            bg: bgHover,
            color: handleHoverColor,
            transform: 'scale(1.1)'
          }}
          _active={{
            bg: bgHover,
            transform: 'scale(0.95)',
          }}
          onClick={onAddClick}
          minW="24px"
          h="24px"
          borderRadius="md"
          transition="all 0.1s"
        />
      </Tooltip>

      {/* Drag handle (6 dots) */}
      <Tooltip label="Drag to move • Click for menu" placement="top" hasArrow fontSize="xs" openDelay={500}>
        <Box
          draggable
          onDragStart={(e) => {
            setIsDragging(true);
            onDragStart?.(e);
          }}
          onDragEnd={() => setIsDragging(false)}
          cursor="grab"
          _active={{ cursor: 'grabbing' }}
          color={handleColor}
          _hover={{
            color: handleHoverColor,
            bg: bgHover,
          }}
          borderRadius="md"
          p={1}
          ml={0.5}
          transition="all 0.12s"
          onClick={onMenuClick}
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="24px"
          h="24px"
        >
          <FiMenu size={16} />
        </Box>
      </Tooltip>
    </MotionHStack>
  );
};
