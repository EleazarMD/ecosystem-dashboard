/**
 * WorkspaceNavigationSidebar - Unified navigation with favorites, recent, and backlinks
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  IconButton,
  Collapse,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiStar, FiClock, FiLink } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { FavoritesPanel } from './FavoritesPanel';
import { RecentPagesPanel } from './RecentPagesPanel';
import { BacklinksPanel } from './BacklinksPanel';

interface WorkspaceNavigationSidebarProps {
  workspaceId: string;
  userId: string;
  currentPageId?: string;
  onPageClick?: (pageId: string) => void;
}

export function WorkspaceNavigationSidebar({
  workspaceId,
  userId,
  currentPageId,
  onPageClick,
}: WorkspaceNavigationSidebarProps) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [backlinksExpanded, setBacklinksExpanded] = useState(true);

  const bgColor = useSemanticToken('surface.default');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  return (
    <Box
      w="280px"
      h="full"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      overflowY="auto"
    >
      <VStack spacing={0} align="stretch">
        {/* Favorites Section */}
        <Box>
          <HStack
            p={3}
            cursor="pointer"
            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
            _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
          >
            <Icon
              as={favoritesExpanded ? FiChevronDown : FiChevronRight}
              boxSize={4}
              color={textSecondary}
            />
            <Icon as={FiStar} boxSize={4} color="yellow.500" />
            <Text fontSize="sm" fontWeight="medium" flex={1}>
              Favorites
            </Text>
          </HStack>
          <Collapse in={favoritesExpanded} animateOpacity>
            <FavoritesPanel
              workspaceId={workspaceId}
              userId={userId}
              onPageClick={onPageClick}
            />
          </Collapse>
        </Box>

        <Divider />

        {/* Recent Pages Section */}
        <Box>
          <HStack
            p={3}
            cursor="pointer"
            onClick={() => setRecentExpanded(!recentExpanded)}
            _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
          >
            <Icon
              as={recentExpanded ? FiChevronDown : FiChevronRight}
              boxSize={4}
              color={textSecondary}
            />
            <Icon as={FiClock} boxSize={4} color={textSecondary} />
            <Text fontSize="sm" fontWeight="medium" flex={1}>
              Recent
            </Text>
          </HStack>
          <Collapse in={recentExpanded} animateOpacity>
            <RecentPagesPanel
              workspaceId={workspaceId}
              userId={userId}
              onPageClick={onPageClick}
              limit={10}
            />
          </Collapse>
        </Box>

        <Divider />

        {/* Backlinks Section (only show if on a page) */}
        {currentPageId && (
          <Box>
            <HStack
              p={3}
              cursor="pointer"
              onClick={() => setBacklinksExpanded(!backlinksExpanded)}
              _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
            >
              <Icon
                as={backlinksExpanded ? FiChevronDown : FiChevronRight}
                boxSize={4}
                color={textSecondary}
              />
              <Icon as={FiLink} boxSize={4} color={textSecondary} />
              <Text fontSize="sm" fontWeight="medium" flex={1}>
                Backlinks
              </Text>
            </HStack>
            <Collapse in={backlinksExpanded} animateOpacity>
              <BacklinksPanel
                pageId={currentPageId}
                workspaceId={workspaceId}
                onPageClick={onPageClick}
              />
            </Collapse>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
