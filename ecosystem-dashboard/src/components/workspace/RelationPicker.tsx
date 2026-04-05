/**
 * Relation Picker Component
 * Searchable dropdown for selecting related pages from a database
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  VStack,
  HStack,
  Text,
  Spinner,
  Portal,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiFile, FiLink } from 'react-icons/fi';
import { useRelationSearch } from '../../hooks/useRelationSearch';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RelationPage {
  id: string;
  title: string;
  icon?: string;
  properties?: Record<string, any>;
}

interface RelationValue {
  id: string;
  target_page_id: string;
  target_page_title?: string;
}

interface RelationPickerProps {
  databaseId: string;
  value?: RelationValue | RelationValue[];
  onChange: (value: RelationValue | RelationValue[]) => void;
  multiple?: boolean;
  placeholder?: string;
  onClose?: () => void;
  autoFocus?: boolean;
}

export function RelationPicker({
  databaseId,
  value,
  onChange,
  multiple = false,
  placeholder = 'Search pages...',
  onClose,
  autoFocus = true,
}: RelationPickerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { pages, loading } = useRelationSearch({ databaseId });

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const footerBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Filter pages based on query
  const filteredPages = pages.filter(page => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return page.title.toLowerCase().includes(searchLower);
  });

  // Get currently selected pages
  const selectedPages = multiple && Array.isArray(value) ? value : [];

  // Filter out already selected pages
  const availablePages = filteredPages.filter(
    page => !selectedPages.some(selected => selected.target_page_id === page.id)
  );

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [autoFocus]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, availablePages.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (availablePages[selectedIndex]) {
            handleSelect(availablePages[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, availablePages]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleSelect = (page: RelationPage) => {
    const relationValue: RelationValue = {
      id: `rel-${Date.now()}`,
      target_page_id: page.id,
      target_page_title: page.title,
    };

    if (multiple) {
      const newValue = [...selectedPages, relationValue];
      onChange(newValue);
      setQuery('');
      setSelectedIndex(0);
    } else {
      onChange(relationValue);
      handleClose();
    }
  };

  const handleRemove = (pageId: string) => {
    if (multiple && Array.isArray(value)) {
      const newValue = value.filter(v => v.target_page_id !== pageId);
      onChange(newValue);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        onClick={handleClose}
        zIndex={1399}
      />

      {/* Dropdown */}
      <Portal>
        <Box
          ref={menuRef}
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow="xl"
          minW="400px"
          maxW="500px"
          maxH="400px"
          overflow="hidden"
          zIndex={1400}
        >
          {/* Search Input */}
          <Box px="8px" py="6px" borderBottom="1px solid" borderColor={borderColor}>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              size="sm"
              fontSize="13px"
              h="28px"
              border="none"
              px="6px"
              py="4px"
              _focus={{ boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400', fontSize: '13px' }}
            />
          </Box>

          {/* Selected Pages (if multiple) */}
          {multiple && selectedPages.length > 0 && (
            <Box px="8px" py="6px" borderBottom="1px solid" borderColor={borderColor}>
              <HStack spacing={1} flexWrap="wrap">
                {selectedPages.map(rel => (
                  <Badge
                    key={rel.id}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    colorScheme="purple"
                  >
                    <Icon as={FiLink} boxSize={3} />
                    <Text>{rel.target_page_title || 'Untitled'}</Text>
                    <Text
                      as="span"
                      cursor="pointer"
                      onClick={() => handleRemove(rel.target_page_id)}
                      _hover={{ opacity: 0.7 }}
                    >
                      ×
                    </Text>
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* Page List */}
          <Box maxH="300px" overflowY="auto">
            {loading ? (
              <Box p={4} textAlign="center">
                <Spinner size="sm" />
              </Box>
            ) : availablePages.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text color={mutedColor} fontSize="13px">
                  No pages found
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={0} py={1}>
                {availablePages.map((page, index) => (
                  <HStack
                    key={page.id}
                    data-index={index}
                    px="6px"
                    py="6px"
                    h="40px"
                    spacing={2}
                    bg={index === selectedIndex ? selectedBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    onClick={() => handleSelect(page)}
                    borderRadius="md"
                    mx={1}
                  >
                    {/* Icon */}
                    <Text fontSize="16px" lineHeight="1">
                      {typeof page.icon === 'object' && page.icon?.emoji ? page.icon.emoji : (page.icon || '📄')}
                    </Text>
                    
                    {/* Title */}
                    <VStack align="stretch" spacing={0} flex={1}>
                      <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
                        {page.title || 'Untitled'}
                      </Text>
                    </VStack>

                    {/* Link icon */}
                    <Icon as={FiLink} boxSize={3} color={mutedColor} />
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>

          {/* Footer */}
          <Box
            px="8px"
            py="6px"
            h="28px"
            borderTop="1px solid"
            borderColor={borderColor}
            bg={footerBg}
          >
            <HStack fontSize="10px" color={mutedColor} justify="space-between" h="full" align="center">
              <HStack spacing={2}>
                <Text>↑↓ Navigate</Text>
                <Text>↵ Select</Text>
              </HStack>
              <Text>esc Close</Text>
            </HStack>
          </Box>
        </Box>
      </Portal>
    </>
  );
}
