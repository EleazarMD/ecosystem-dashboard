/**
 * FavoritesPanel - Display and manage favorite (starred) pages
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Spinner,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiStar, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface FavoritePage {
  id: string;
  pageId: string;
  pageTitle: string;
  createdAt: Date;
}

interface FavoritesPanelProps {
  workspaceId: string;
  userId: string;
  onPageClick?: (pageId: string) => void;
}

export function FavoritesPanel({
  workspaceId,
  userId,
  onPageClick,
}: FavoritesPanelProps) {
  const [favorites, setFavorites] = useState<FavoritePage[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadFavorites();
  }, [workspaceId, userId]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/favorites?workspaceId=${workspaceId}&userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setFavorites(favorites.filter(f => f.id !== favoriteId));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handlePageClick = (pageId: string) => {
    if (onPageClick) {
      onPageClick(pageId);
    }
  };

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <Spinner size="sm" />
        <Text fontSize="sm" color={textTertiary} mt={2}>
          Loading favorites...
        </Text>
      </Box>
    );
  }

  if (favorites.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Icon as={FiStar} boxSize={6} color={textTertiary} mb={2} />
        <Text fontSize="sm" color={textTertiary}>
          No favorites yet
        </Text>
        <Text fontSize="xs" color={textTertiary} mt={1}>
          Star pages to add them here
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch" w="full">
      <Box p={3} borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <Icon as={FiStar} color="yellow.500" />
          <Text fontSize="sm" fontWeight="medium">
            Favorites
          </Text>
          <Text fontSize="xs" color={textTertiary}>
            ({favorites.length})
          </Text>
        </HStack>
      </Box>

      <VStack spacing={0} align="stretch" maxH="400px" overflowY="auto">
        {favorites.map((favorite) => (
          <Box
            key={favorite.id}
            p={3}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            transition="background 0.2s"
            onClick={() => handlePageClick(favorite.pageId)}
          >
            <HStack spacing={2} justify="space-between">
              <HStack spacing={2} flex={1} minW={0}>
                <Icon as={FiExternalLink} boxSize={3} color={textSecondary} />
                <Text fontSize="sm" noOfLines={1} flex={1}>
                  {favorite.pageTitle || 'Untitled'}
                </Text>
              </HStack>
              <Tooltip label="Remove from favorites">
                <IconButton
                  aria-label="Remove favorite"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={(e) => handleRemoveFavorite(favorite.id, e)}
                />
              </Tooltip>
            </HStack>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
