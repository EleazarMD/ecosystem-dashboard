/**
 * Place Property Display
 * Shows place property values with location information
 */

import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { FiMapPin, FiNavigation } from 'react-icons/fi';
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

interface PlacePropertyDisplayProps {
  value: Place | null;
  variant?: 'full' | 'compact' | 'coordinates';
  onClick?: () => void;
  onNavigate?: (lat: number, lng: number) => void;
}

export function PlacePropertyDisplay({
  value,
  variant = 'full',
  onClick,
  onNavigate,
}: PlacePropertyDisplayProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const emptyColor = useSemanticToken('text.tertiary');
  const hoverBg = useSemanticToken('surface.hover');

  if (!value) {
    return (
      <Text
        fontSize="13px"
        color={emptyColor}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        Empty
      </Text>
    );
  }

  // Format address
  const formatAddress = () => {
    const parts = [value.city, value.state, value.country].filter(Boolean);
    return parts.join(', ') || value.address || '';
  };

  // Coordinates only
  if (variant === 'coordinates') {
    if (!value.latitude || !value.longitude) {
      return (
        <Text fontSize="11px" color={mutedColor}>
          No coordinates
        </Text>
      );
    }

    return (
      <HStack spacing={1}>
        <Icon as={FiNavigation} boxSize={3} color={mutedColor} />
        <Text fontSize="11px" color={mutedColor} fontFamily="mono">
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </Text>
      </HStack>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <HStack
        spacing={2}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
        px={2}
        py={1}
        borderRadius="md"
        _hover={onClick ? { bg: hoverBg } : {}}
      >
        <Icon as={FiMapPin} boxSize={3} color={mutedColor} />
        <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
          {value.name}
        </Text>
        {value.latitude && value.longitude && onNavigate && (
          <Icon
            as={FiNavigation}
            boxSize={3}
            color="blue.500"
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(value.latitude!, value.longitude!);
            }}
            _hover={{ transform: 'scale(1.2)' }}
          />
        )}
      </HStack>
    );
  }

  // Full variant
  return (
    <Box
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      px={2}
      py={2}
      borderRadius="md"
      _hover={onClick ? { bg: hoverBg } : {}}
    >
      <HStack spacing={2} align="flex-start">
        <Icon as={FiMapPin} boxSize={4} color={mutedColor} mt={0.5} />
        
        <VStack align="stretch" spacing={1} flex={1}>
          <HStack justify="space-between">
            <Text fontSize="13px" fontWeight="600" color={textColor} lineHeight="1.2">
              {value.name}
            </Text>
            {value.latitude && value.longitude && onNavigate && (
              <Icon
                as={FiNavigation}
                boxSize={3}
                color="blue.500"
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(value.latitude!, value.longitude!);
                }}
                _hover={{ transform: 'scale(1.2)' }}
              />
            )}
          </HStack>

          {formatAddress() && (
            <Text fontSize="12px" color={mutedColor} lineHeight="1.2">
              {formatAddress()}
            </Text>
          )}

          {value.address && value.address !== formatAddress() && (
            <Text fontSize="11px" color={mutedColor} lineHeight="1.2">
              {value.address}
            </Text>
          )}

          {value.latitude && value.longitude && (
            <HStack spacing={2} flexWrap="wrap">
              <Badge fontSize="9px" colorScheme="green">
                <Icon as={FiNavigation} boxSize={2} mr={1} />
                {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
              </Badge>
              {value.postal_code && (
                <Badge fontSize="9px" colorScheme="gray">
                  {value.postal_code}
                </Badge>
              )}
            </HStack>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}
