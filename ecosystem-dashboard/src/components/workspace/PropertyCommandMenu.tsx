/**
 * PropertyCommandMenu - Notion-style slash command menu for properties
 * Context-aware, searchable menu for adding/editing properties
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Icon,
  Portal,
  Kbd,
} from '@chakra-ui/react';
import {
  PropertyDefinition,
  PropertyCategory,
  PropertyType,
  searchProperties,
  getPropertyGroups,
} from '@/lib/property-registry';

interface PropertyCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (property: PropertyDefinition) => void;
  position?: { x: number; y: number };
  context?: {
    view?: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
    hasDatabase?: boolean;
    currentPropertyType?: PropertyType;
  };
  initialQuery?: string;
}

const CATEGORY_LABELS: Record<PropertyCategory, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  select: 'Select',
  relation: 'Relation',
  media: 'Media',
  date: 'Date & Time',
};

export function PropertyCommandMenu({
  isOpen,
  onClose,
  onSelect,
  position,
  context,
  initialQuery = '',
}: PropertyCommandMenuProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surfaceActive');
  const categoryColor = useSemanticToken('text.tertiary');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Search results
  const results = useMemo(() => {
    return searchProperties(query, context);
  }, [query, context]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<PropertyCategory, PropertyDefinition[]> = {
      basic: [],
      advanced: [],
      select: [],
      relation: [],
      media: [],
      date: [],
    };

    results.forEach(prop => {
      groups[prop.category].push(prop);
    });

    // Filter out empty categories
    return Object.entries(groups).filter(([_, props]) => props.length > 0);
  }, [results]);

  // Flatten for keyboard navigation
  const flatResults = useMemo(() => results, [results]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < flatResults.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;

        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            onSelect(flatResults[selectedIndex]);
            onClose();
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatResults, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!menuRef.current) return;

    const selectedElement = menuRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );

    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const menuPosition = position || { x: 100, y: 100 };

  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        onClick={onClose}
        zIndex={1399}
      />

      {/* Menu */}
      <Portal>
        <Box
          ref={menuRef}
          position="fixed"
          top={`${menuPosition.y}px`}
          left={`${menuPosition.x}px`}
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow="xl"
          minW="280px"
          maxW="320px"
          maxH="480px"
          overflow="hidden"
          zIndex={1400}
        >
          {/* Search Input */}
          <Box px="8px" py="6px" borderBottom="1px solid" borderColor={borderColor}>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search property types..."
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

          {/* Results */}
          <Box maxH="400px" overflowY="auto">
            {groupedResults.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text color={mutedColor} fontSize="sm">
                  No properties found
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={0} py={1}>
                {groupedResults.map(([category, properties], groupIndex) => (
                  <Box key={category}>
                    {/* Category Header */}
                    <HStack px="6px" py="4px" spacing={2}>
                      <Text
                        fontSize="10px"
                        fontWeight="600"
                        color={categoryColor}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {CATEGORY_LABELS[category as PropertyCategory]}
                      </Text>
                    </HStack>

                    {/* Property Items */}
                    {properties.map((prop, propIndex) => {
                      const globalIndex = flatResults.findIndex(p => p.id === prop.id);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <HStack
                          key={prop.id}
                          data-index={globalIndex}
                          px="6px"
                          py="6px"
                          h="30px"
                          spacing={2}
                          bg={isSelected ? selectedBg : 'transparent'}
                          _hover={{ bg: hoverBg }}
                          cursor="pointer"
                          onClick={() => {
                            onSelect(prop);
                            onClose();
                          }}
                          transition="background 0.1s"
                          borderRadius="md"
                          mx={1}
                        >
                          {/* Icon */}
                          <Text fontSize="sm" lineHeight="1">{prop.icon}</Text>

                          {/* Info */}
                          <VStack align="stretch" spacing={0} flex={1} justify="center">
                            <HStack justify="space-between" align="center">
                              <Text fontSize="13px" fontWeight="400" color={textColor} lineHeight="1.2">
                                {prop.name}
                              </Text>

                              {/* Badges */}
                              <HStack spacing={1}>
                                {prop.config?.isReadOnly && (
                                  <Text
                                    fontSize="10px"
                                    color={mutedColor}
                                    px={1}
                                    py={0.5}
                                    borderRadius="sm"
                                    bg={hoverBg}
                                  >
                                    Read-only
                                  </Text>
                                )}

                                {prop.config?.hasOptions && (
                                  <Text
                                    fontSize="10px"
                                    color={mutedColor}
                                    px={1}
                                    py={0.5}
                                    borderRadius="sm"
                                    bg={hoverBg}
                                  >
                                    Options
                                  </Text>
                                )}
                              </HStack>
                            </HStack>
                          </VStack>
                        </HStack>
                      );
                    })}
                  </Box>
                ))}
              </VStack>
            )}
          </Box>

          {/* Footer Hints */}
          <Box
            px="8px"
            py="6px"
            h="28px"
            borderTop="1px solid"
            borderColor={borderColor}
            bg={useSemanticToken('surface.raised')}
          >
            <HStack fontSize="10px" color={mutedColor} justify="space-between" h="full" align="center">
              <HStack spacing={2}>
                <HStack spacing={1}>
                  <Kbd fontSize="9px" py={0} px="4px" h="16px" minW="16px">↑</Kbd>
                  <Kbd fontSize="9px" py={0} px="4px" h="16px" minW="16px">↓</Kbd>
                  <Text>Navigate</Text>
                </HStack>
                <HStack spacing={1}>
                  <Kbd fontSize="9px" py={0} px="4px" h="16px" minW="16px">↵</Kbd>
                  <Text>Select</Text>
                </HStack>
              </HStack>
              <HStack spacing={1}>
                <Kbd fontSize="9px" py={0} px="4px" h="16px" minW="16px">esc</Kbd>
                <Text>Close</Text>
              </HStack>
            </HStack>
          </Box>
        </Box>
      </Portal>
    </>
  );
}
