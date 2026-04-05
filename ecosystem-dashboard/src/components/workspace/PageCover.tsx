/**
 * Page Cover Component
 * Displays cover image/gradient at top of page (Notion-style)
 */

import React from 'react';
import {
  Box,
  IconButton,
  HStack,
  Icon,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { FiImage, FiX } from 'react-icons/fi';

interface PageCoverProps {
  coverUrl?: string;
  coverType?: 'image' | 'gradient' | 'solid';
  onChangeCover?: () => void;
  onRemoveCover?: () => void;
  isEditable?: boolean;
}

// Built-in gradients (Notion-style)
export const NOTION_GRADIENTS = {
  gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  gradient6: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  gradient7: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  gradient8: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  pastel: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ocean: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)',
  sunset: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
  forest: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  aurora: 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)',
};

// Solid colors
export const NOTION_COLORS = {
  beige: '#f5f5dc',
  blue: '#4a90e2',
  gray: '#95a5a6',
  brown: '#8b7355',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  pink: '#fd79a8',
};

export function PageCover({
  coverUrl,
  coverType = 'image',
  onChangeCover,
  onRemoveCover,
  isEditable = true,
}: PageCoverProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getCoverStyle = () => {
    if (!coverUrl) return {};

    if (coverType === 'gradient') {
      return {
        background: NOTION_GRADIENTS[coverUrl as keyof typeof NOTION_GRADIENTS] || coverUrl,
      };
    }

    if (coverType === 'solid') {
      return {
        background: NOTION_COLORS[coverUrl as keyof typeof NOTION_COLORS] || coverUrl,
      };
    }

    // Image
    return {
      backgroundImage: `url(${coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'scroll',
    };
  };

  // If no cover, don't show anything (Notion style - buttons are in title area)
  if (!coverUrl) return null;

  return (
    <Box
      position="relative"
      width="100%"
      maxWidth="100%"
      height="180px"
      {...getCoverStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transition="all 0.2s"
      overflow="hidden"
      flexShrink={0}
      boxSizing="border-box"
      margin={0}
      padding={0}
    >
      {/* Hover Actions */}
      {isEditable && isHovered && (
        <HStack
          position="absolute"
          bottom={4}
          right={4}
          spacing={2}
          bg="blackAlpha.600"
          backdropFilter="blur(10px)"
          borderRadius="md"
          p={1}
        >
          <Tooltip label="Change cover" placement="top">
            <IconButton
              aria-label="Change cover"
              icon={<FiImage />}
              size="sm"
              variant="ghost"
              colorScheme="whiteAlpha"
              color="whiteAlpha.900"
              onClick={onChangeCover}
              _hover={{ bg: 'whiteAlpha.300' }}
            />
          </Tooltip>
          {coverUrl && (
            <Tooltip label="Remove cover" placement="top">
              <IconButton
                aria-label="Remove cover"
                icon={<FiX />}
                size="sm"
                variant="ghost"
                colorScheme="whiteAlpha"
                color="whiteAlpha.900"
                onClick={onRemoveCover}
                _hover={{ bg: 'whiteAlpha.300' }}
              />
            </Tooltip>
          )}
        </HStack>
      )}

      {/* Add Cover Button (when no cover) */}
      {!coverUrl && isEditable && isHovered && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
        >
          <IconButton
            aria-label="Add cover"
            icon={<FiImage />}
            size="lg"
            colorScheme="blue"
            onClick={onChangeCover}
          />
        </Box>
      )}
    </Box>
  );
}
