/**
 * MentionAutocomplete - Autocomplete dropdown for @page mentions
 * Appears when user types @ in the editor
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiFile, FiDatabase } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PageSuggestion {
  id: string;
  title: string;
  type: 'page' | 'database';
  icon?: string;
}

interface MentionAutocompleteProps {
  query: string;
  workspaceId: string;
  position: { x: number; y: number };
  onSelect: (page: PageSuggestion) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  query,
  workspaceId,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PageSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    loadSuggestions();
  }, [query, workspaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/workspace/${workspaceId}/pages/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.pages || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Failed to load page suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (page: PageSuggestion) => {
    onSelect(page);
  };

  if (loading) {
    return (
      <Box
        ref={containerRef}
        position="fixed"
        left={`${position.x}px`}
        top={`${position.y}px`}
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="md"
        boxShadow="lg"
        p={3}
        zIndex={1000}
        minW="300px"
      >
        <HStack spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color={textSecondary}>
            Loading pages...
          </Text>
        </HStack>
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Box
        ref={containerRef}
        position="fixed"
        left={`${position.x}px`}
        top={`${position.y}px`}
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="md"
        boxShadow="lg"
        p={3}
        zIndex={1000}
        minW="300px"
      >
        <Text fontSize="sm" color={textSecondary}>
          No pages found
        </Text>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      position="fixed"
      left={`${position.x}px`}
      top={`${position.y}px`}
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="lg"
      zIndex={1000}
      minW="300px"
      maxH="400px"
      overflowY="auto"
    >
      <VStack spacing={0} align="stretch">
        {suggestions.map((page, index) => (
          <Box
            key={page.id}
            px={3}
            py={2}
            cursor="pointer"
            bg={index === selectedIndex ? selectedBg : 'transparent'}
            _hover={{ bg: hoverBg }}
            onClick={() => handleSelect(page)}
            transition="background 0.2s"
          >
            <HStack spacing={2}>
              <Icon
                as={page.type === 'database' ? FiDatabase : FiFile}
                boxSize={4}
                color={textSecondary}
              />
              <Text fontSize="sm" color={textPrimary} flex={1} noOfLines={1}>
                {page.title || 'Untitled'}
              </Text>
              {page.icon && (
                <Text fontSize="sm">{page.icon}</Text>
              )}
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
