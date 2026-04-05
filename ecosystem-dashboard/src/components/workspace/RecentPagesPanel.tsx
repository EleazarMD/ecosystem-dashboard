/**
 * RecentPagesPanel - Display recently viewed pages
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Spinner,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiClock, FiExternalLink } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RecentPage {
  pageId: string;
  pageTitle: string;
  lastViewed: Date;
  viewCount: number;
}

interface RecentPagesPanelProps {
  workspaceId: string;
  userId: string;
  onPageClick?: (pageId: string) => void;
  limit?: number;
}

export function RecentPagesPanel({
  workspaceId,
  userId,
  onPageClick,
  limit = 10,
}: RecentPagesPanelProps) {
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadRecentPages();
  }, [workspaceId, userId, limit]);

  const loadRecentPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/recent-pages?workspaceId=${workspaceId}&userId=${userId}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentPages(data.recentPages || []);
      }
    } catch (error) {
      console.error('Error loading recent pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageClick = (pageId: string) => {
    if (onPageClick) {
      onPageClick(pageId);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="sm" />
        <Text fontSize="sm" color={textTertiary} mt={2}>
          Loading recent pages...
        </Text>
      </Box>
    );
  }

  if (recentPages.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Icon as={FiClock} boxSize={6} color={textTertiary} mb={2} />
        <Text fontSize="sm" color={textTertiary}>
          No recent pages
        </Text>
        <Text fontSize="xs" color={textTertiary} mt={1}>
          Pages you view will appear here
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch" w="full">
      <Box p={3} borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <Icon as={FiClock} color={textSecondary} />
          <Text fontSize="sm" fontWeight="medium">
            Recent
          </Text>
        </HStack>
      </Box>

      <VStack spacing={0} align="stretch" maxH="400px" overflowY="auto">
        {recentPages.map((page) => (
          <Box
            key={page.pageId}
            p={3}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            transition="background 0.2s"
            onClick={() => handlePageClick(page.pageId)}
          >
            <HStack spacing={2} justify="space-between">
              <HStack spacing={2} flex={1} minW={0}>
                <Icon as={FiExternalLink} boxSize={3} color={textSecondary} />
                <Text fontSize="sm" noOfLines={1} flex={1}>
                  {page.pageTitle || 'Untitled'}
                </Text>
              </HStack>
              <HStack spacing={2} flexShrink={0}>
                {page.viewCount > 1 && (
                  <Badge colorScheme="blue" fontSize="xs">
                    {page.viewCount}
                  </Badge>
                )}
                <Text fontSize="xs" color={textTertiary}>
                  {formatDate(page.lastViewed)}
                </Text>
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
