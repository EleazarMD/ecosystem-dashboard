/**
 * Place Picker Component
 * Searchable dropdown for selecting locations with Google Places integration
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
  Icon,
  Badge,
} from '@chakra-ui/react';
import { FiMapPin, FiGlobe } from 'react-icons/fi';
import { usePlaceSearch } from '../../hooks/usePlaceSearch';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Place {
  id?: string;
  place_id?: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

interface PlacePickerProps {
  value?: Place;
  onChange: (value: Place) => void;
  placeholder?: string;
  onClose?: () => void;
  autoFocus?: boolean;
  useGoogle?: boolean;
}

export function PlacePicker({
  value,
  onChange,
  placeholder = 'Search for a place...',
  onClose,
  autoFocus = true,
  useGoogle = false,
}: PlacePickerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { places, loading } = usePlaceSearch({ useGoogle });

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const footerBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [autoFocus]);

  // Update search when query changes
  useEffect(() => {
    if (query.length >= 2) {
      // Search is handled by the hook
    }
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, places.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (places[selectedIndex]) {
            handleSelect(places[selectedIndex]);
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
  }, [isOpen, selectedIndex, places]);

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

  const handleSelect = (place: Place) => {
    onChange(place);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Format address display
  const formatAddress = (place: Place) => {
    const parts = [place.city, place.state, place.country].filter(Boolean);
    return parts.join(', ') || place.address || 'Unknown location';
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
            <HStack spacing={2}>
              <Icon as={FiMapPin} boxSize={4} color={mutedColor} />
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
              {useGoogle && (
                <Badge colorScheme="blue" fontSize="9px">
                  <Icon as={FiGlobe} boxSize={2} mr={1} />
                  Google
                </Badge>
              )}
            </HStack>
          </Box>

          {/* Place List */}
          <Box maxH="300px" overflowY="auto">
            {loading ? (
              <Box p={4} textAlign="center">
                <Spinner size="sm" />
              </Box>
            ) : query.length < 2 ? (
              <Box p={4} textAlign="center">
                <Text color={mutedColor} fontSize="13px">
                  Type at least 2 characters to search
                </Text>
              </Box>
            ) : places.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text color={mutedColor} fontSize="13px">
                  No places found
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={0} py={1}>
                {places.map((place, index) => (
                  <HStack
                    key={place.id || place.place_id || index}
                    data-index={index}
                    px="6px"
                    py="6px"
                    h="50px"
                    spacing={2}
                    bg={index === selectedIndex ? selectedBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    onClick={() => handleSelect(place)}
                    borderRadius="md"
                    mx={1}
                    align="flex-start"
                  >
                    {/* Icon */}
                    <Icon as={FiMapPin} boxSize={4} color={mutedColor} mt={1} />
                    
                    {/* Info */}
                    <VStack align="stretch" spacing={0} flex={1}>
                      <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
                        {place.name}
                      </Text>
                      <Text fontSize="11px" color={mutedColor} lineHeight="1.2">
                        {formatAddress(place)}
                      </Text>
                    </VStack>

                    {/* Coordinates badge (if available) */}
                    {place.latitude && place.longitude && (
                      <Badge fontSize="9px" colorScheme="green">
                        {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                      </Badge>
                    )}
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
