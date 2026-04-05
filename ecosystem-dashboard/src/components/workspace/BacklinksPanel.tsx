/**
 * BacklinksPanel - Display pages that link to the current page
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Link,
  Spinner,
  Icon,
  Tooltip,
  Badge,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiLink, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { BacklinkTracker, Backlink } from '@/lib/mentions/BacklinkTracker';

interface BacklinksPanelProps {
  pageId: string;
  workspaceId: string;
  onPageClick?: (pageId: string) => void;
}

export function BacklinksPanel({
  pageId,
  workspaceId,
  onPageClick,
}: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadBacklinks();
  }, [pageId, workspaceId]);

  const loadBacklinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const links = await BacklinkTracker.getBacklinks(pageId, workspaceId);
      setBacklinks(links);
    } catch (err) {
      console.error('Error loading backlinks:', err);
      setError('Failed to load backlinks');
    } finally {
      setLoading(false);
    }
  };

  const handleBacklinkClick = (sourcePageId: string) => {
    if (onPageClick) {
      onPageClick(sourcePageId);
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

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="sm" />
        <Text fontSize="sm" color={textTertiary} mt={2}>
          Loading backlinks...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <HStack spacing={2} color="red.500">
          <Icon as={FiAlertCircle} />
          <Text fontSize="sm">{error}</Text>
        </HStack>
      </Box>
    );
  }

  if (backlinks.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Icon as={FiLink} boxSize={6} color={textTertiary} mb={2} />
        <Text fontSize="sm" color={textTertiary}>
          No backlinks yet
        </Text>
        <Text fontSize="xs" color={textTertiary} mt={1}>
          Pages that mention this page will appear here
        </Text>
      </Box>
    );
  }

  const uniquePages = new Set(backlinks.map(b => b.sourcePageId)).size;

  return (
    <VStack spacing={0} align="stretch" w="full">
      <Box p={3} borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={2} justify="space-between">
          <HStack spacing={2}>
            <Icon as={FiLink} color={textSecondary} />
            <Text fontSize="sm" fontWeight="medium">
              Backlinks
            </Text>
          </HStack>
          <Tooltip label={`${backlinks.length} mentions from ${uniquePages} pages`}>
            <Badge colorScheme="blue" fontSize="xs">
              {backlinks.length}
            </Badge>
          </Tooltip>
        </HStack>
      </Box>

      <VStack spacing={0} align="stretch" maxH="400px" overflowY="auto">
        {backlinks.map((backlink, index) => (
          <React.Fragment key={`${backlink.sourcePageId}-${backlink.blockId}-${index}`}>
            <Box
              p={3}
              cursor="pointer"
              _hover={{ bg: hoverBg }}
              transition="background 0.2s"
              onClick={() => handleBacklinkClick(backlink.sourcePageId)}
            >
              <VStack spacing={2} align="stretch">
                <HStack spacing={2} justify="space-between">
                  <HStack spacing={2} flex={1} minW={0}>
                    <Icon as={FiExternalLink} boxSize={3} color={textSecondary} />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      noOfLines={1}
                      flex={1}
                    >
                      {backlink.sourcePageTitle || 'Untitled'}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color={textTertiary} flexShrink={0}>
                    {formatDate(backlink.createdAt)}
                  </Text>
                </HStack>

                <Box
                  pl={5}
                  fontSize="xs"
                  color={textSecondary}
                  bg={useColorModeValue('gray.50', 'gray.800')}
                  p={2}
                  borderRadius="md"
                  borderLeft="2px"
                  borderColor="blue.400"
                >
                  <Text noOfLines={2}>
                    {truncateContent(backlink.blockContent)}
                  </Text>
                </Box>

                {backlink.mentionText && (
                  <HStack spacing={1} pl={5}>
                    <Text fontSize="xs" color={textTertiary}>
                      Mentioned as:
                    </Text>
                    <Text fontSize="xs" color="blue.500" fontWeight="medium">
                      {backlink.mentionText}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>
            {index < backlinks.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </VStack>
    </VStack>
  );
}
