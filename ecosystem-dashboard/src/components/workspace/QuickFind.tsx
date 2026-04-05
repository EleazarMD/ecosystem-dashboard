/**
 * QuickFind - Cmd+K quick search modal
 * Full-text search across all workspace pages
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Input,
  VStack,
  HStack,
  Text,
  Icon,
  Box,
  Kbd,
  Spinner,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiSearch, FiFile, FiDatabase, FiClock, FiStar } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  type: 'page' | 'database';
  matchScore: number;
  lastEditedAt: Date;
  isFavorite?: boolean;
}

interface QuickFindProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  onPageSelect: (pageId: string) => void;
}

export function QuickFind({
  isOpen,
  onClose,
  workspaceId,
  userId,
  onPageSelect,
}: QuickFindProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentPages, setRecentPages] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      loadRecentPages();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      const debounce = setTimeout(() => {
        performSearch(query);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setResults([]);
    }
  }, [query]);

  const loadRecentPages = async () => {
    try {
      const response = await fetch(
        `/api/recent-pages?workspaceId=${workspaceId}&userId=${userId}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setRecentPages(
          data.recentPages?.map((p: any) => ({
            pageId: p.pageId,
            title: p.pageTitle,
            excerpt: '',
            type: 'page',
            matchScore: 0,
            lastEditedAt: new Date(p.lastViewed),
          })) || []
        );
      }
    } catch (error) {
      console.error('Failed to load recent pages:', error);
    }
  };

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&workspaceId=${workspaceId}&userId=${userId}`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const displayResults = query.trim() ? results : recentPages;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, displayResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayResults[selectedIndex]) {
        handleSelect(displayResults[selectedIndex].pageId);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (pageId: string) => {
    onPageSelect(pageId);
    onClose();
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

  const displayResults = query.trim() ? results : recentPages;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent bg={bgColor} mt="20vh" maxH="60vh">
        <ModalBody p={0}>
          <VStack spacing={0} align="stretch">
            {/* Search Input */}
            <HStack spacing={3} p={4} borderBottom="1px" borderColor={borderColor}>
              <Icon as={FiSearch} boxSize={5} color={textSecondary} />
              <Input
                ref={inputRef}
                placeholder="Search pages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                variant="unstyled"
                fontSize="md"
                _placeholder={{ color: textTertiary }}
              />
              {loading && <Spinner size="sm" />}
            </HStack>

            {/* Results or Recent Pages */}
            <Box maxH="400px" overflowY="auto">
              {displayResults.length === 0 && !loading && (
                <Box p={8} textAlign="center">
                  <Icon as={FiSearch} boxSize={8} color={textTertiary} mb={2} />
                  <Text fontSize="sm" color={textTertiary}>
                    {query.trim() ? 'No results found' : 'Start typing to search'}
                  </Text>
                </Box>
              )}

              {!query.trim() && recentPages.length > 0 && (
                <Box p={3} borderBottom="1px" borderColor={borderColor}>
                  <HStack spacing={2}>
                    <Icon as={FiClock} boxSize={4} color={textSecondary} />
                    <Text fontSize="xs" fontWeight="medium" color={textSecondary} textTransform="uppercase">
                      Recent
                    </Text>
                  </HStack>
                </Box>
              )}

              <VStack spacing={0} align="stretch">
                {displayResults.map((result, index) => (
                  <Box
                    key={result.pageId}
                    px={4}
                    py={3}
                    cursor="pointer"
                    bg={index === selectedIndex ? selectedBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleSelect(result.pageId)}
                    transition="background 0.2s"
                    borderBottom={index < displayResults.length - 1 ? '1px' : 'none'}
                    borderColor={borderColor}
                  >
                    <VStack spacing={2} align="stretch">
                      <HStack spacing={2} justify="space-between">
                        <HStack spacing={2} flex={1} minW={0}>
                          <Icon
                            as={result.type === 'database' ? FiDatabase : FiFile}
                            boxSize={4}
                            color={textSecondary}
                          />
                          <Text fontSize="sm" fontWeight="medium" color={textPrimary} noOfLines={1}>
                            {result.title || 'Untitled'}
                          </Text>
                          {result.isFavorite && (
                            <Icon as={FiStar} boxSize={3} color="yellow.500" />
                          )}
                        </HStack>
                        <Text fontSize="xs" color={textTertiary} flexShrink={0}>
                          {formatDate(result.lastEditedAt)}
                        </Text>
                      </HStack>

                      {result.excerpt && (
                        <Text fontSize="xs" color={textSecondary} noOfLines={2} pl={6}>
                          {result.excerpt}
                        </Text>
                      )}

                      {query.trim() && result.matchScore > 0 && (
                        <HStack spacing={2} pl={6}>
                          <Badge colorScheme="blue" fontSize="xs">
                            {Math.round(result.matchScore * 100)}% match
                          </Badge>
                        </HStack>
                      )}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Footer with keyboard shortcuts */}
            <HStack
              spacing={4}
              p={3}
              borderTop="1px"
              borderColor={borderColor}
              fontSize="xs"
              color={textTertiary}
              justify="space-between"
            >
              <HStack spacing={4}>
                <HStack spacing={1}>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  <Text>Navigate</Text>
                </HStack>
                <HStack spacing={1}>
                  <Kbd>Enter</Kbd>
                  <Text>Select</Text>
                </HStack>
                <HStack spacing={1}>
                  <Kbd>Esc</Kbd>
                  <Text>Close</Text>
                </HStack>
              </HStack>
              <Text>{displayResults.length} results</Text>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
