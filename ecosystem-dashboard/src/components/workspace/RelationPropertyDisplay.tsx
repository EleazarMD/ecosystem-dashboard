/**
 * Relation Property Display
 * Shows relation property values with page links
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
import { FiLink, FiExternalLink } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RelationValue {
  id: string;
  target_page_id: string;
  target_page_title?: string;
}

interface RelationPropertyDisplayProps {
  value: RelationValue | RelationValue[] | null;
  variant?: 'full' | 'compact' | 'count';
  onClick?: () => void;
  onNavigate?: (pageId: string) => void;
}

export function RelationPropertyDisplay({
  value,
  variant = 'full',
  onClick,
  onNavigate,
}: RelationPropertyDisplayProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const emptyColor = useSemanticToken('text.tertiary');
  const linkColor = 'blue.500';
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

  // Single relation
  if (!Array.isArray(value)) {
    const relation = value;

    if (variant === 'count') {
      return (
        <Badge colorScheme="purple" fontSize="12px">
          1 relation
        </Badge>
      );
    }

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
        <Icon as={FiLink} boxSize={3} color={mutedColor} />
        <Text
          fontSize="13px"
          fontWeight="500"
          color={linkColor}
          lineHeight="1.2"
          onClick={(e) => {
            if (onNavigate) {
              e.stopPropagation();
              onNavigate(relation.target_page_id);
            }
          }}
          cursor={onNavigate ? 'pointer' : 'default'}
          _hover={onNavigate ? { textDecoration: 'underline' } : {}}
        >
          {relation.target_page_title || 'Untitled'}
        </Text>
        {onNavigate && (
          <Icon as={FiExternalLink} boxSize={3} color={mutedColor} />
        )}
      </HStack>
    );
  }

  // Multiple relations
  const relations = value;

  if (relations.length === 0) {
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

  if (variant === 'count') {
    return (
      <Badge
        colorScheme="purple"
        fontSize="12px"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        {relations.length} {relations.length === 1 ? 'relation' : 'relations'}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <HStack
        spacing={1}
        flexWrap="wrap"
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        {relations.slice(0, 3).map(rel => (
          <Badge
            key={rel.id}
            colorScheme="purple"
            fontSize="11px"
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Icon as={FiLink} boxSize={2} />
            <Text>{rel.target_page_title || 'Untitled'}</Text>
          </Badge>
        ))}
        {relations.length > 3 && (
          <Badge colorScheme="gray" fontSize="11px">
            +{relations.length - 3}
          </Badge>
        )}
      </HStack>
    );
  }

  // Full variant
  return (
    <VStack
      align="stretch"
      spacing={1}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
    >
      {relations.map(rel => (
        <HStack
          key={rel.id}
          spacing={2}
          px={2}
          py={1}
          borderRadius="md"
          _hover={{ bg: hoverBg }}
        >
          <Icon as={FiLink} boxSize={3} color={mutedColor} />
          <Text
            fontSize="13px"
            fontWeight="500"
            color={linkColor}
            lineHeight="1.2"
            flex={1}
            onClick={(e) => {
              if (onNavigate) {
                e.stopPropagation();
                onNavigate(rel.target_page_id);
              }
            }}
            cursor={onNavigate ? 'pointer' : 'default'}
            _hover={onNavigate ? { textDecoration: 'underline' } : {}}
          >
            {rel.target_page_title || 'Untitled'}
          </Text>
          {onNavigate && (
            <Icon as={FiExternalLink} boxSize={3} color={mutedColor} />
          )}
        </HStack>
      ))}
    </VStack>
  );
}
