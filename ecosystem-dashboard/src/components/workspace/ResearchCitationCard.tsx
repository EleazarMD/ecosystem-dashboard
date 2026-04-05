/**
 * Enhanced Citation Card Component
 * Professional display of research citations with expandable details
 */

import React, { useState } from 'react';
import {
  Box,
  Collapse,
  HStack,
  VStack,
  Text,
  Icon,
  Link,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiExternalLink, FiFileText, FiCalendar, FiGlobe } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface Citation {
  title: string;
  url?: string;
  snippet?: string;
  domain?: string;
  publishedDate?: string;
  author?: string;
  type?: 'article' | 'paper' | 'website' | 'document';
}

interface ResearchCitationCardProps {
  citation: Citation;
  index?: number;
  defaultExpanded?: boolean;
}

export function ResearchCitationCard({ citation, index, defaultExpanded = false }: ResearchCitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const mutedColor = useSemanticToken('text.secondary');
  const linkColor = 'blue.500';
  const textColor = useSemanticToken('text.primary');

  // Extract domain from URL if not provided
  const displayDomain = citation.domain || (citation.url ? new URL(citation.url).hostname.replace('www.', '') : 'Unknown source');

  // Badge color based on type
  const typeColor = 
    citation.type === 'paper' ? 'purple' :
    citation.type === 'article' ? 'blue' :
    citation.type === 'document' ? 'orange' :
    'gray';

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth="3px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      transition="all 0.2s"
      _hover={{ borderColor: linkColor, shadow: 'sm' }}
    >
      {/* Header - Always Visible */}
      <HStack
        px={3}
        py={2}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: hoverBg }}
      >
        <HStack spacing={2} flex={1} align="start">
          {index !== undefined && (
            <Text fontSize="xs" fontWeight="bold" color={linkColor} minW="20px">
              [{index + 1}]
            </Text>
          )}
          
          <VStack align="start" spacing={0.5} flex={1}>
            <Text fontWeight="semibold" fontSize="sm" lineHeight="1.4">
              {citation.title}
            </Text>
            
            <HStack spacing={2} fontSize="xs" color={mutedColor} flexWrap="wrap">
              {displayDomain && (
                <HStack spacing={1}>
                  <Icon as={FiGlobe} boxSize={2.5} />
                  <Text>{displayDomain}</Text>
                </HStack>
              )}
              
              {citation.publishedDate && (
                <HStack spacing={1}>
                  <Icon as={FiCalendar} boxSize={2.5} />
                  <Text>{citation.publishedDate}</Text>
                </HStack>
              )}
              
              {citation.type && (
                <Badge colorScheme={typeColor} fontSize="xs">
                  {citation.type}
                </Badge>
              )}
            </HStack>
          </VStack>
        </HStack>

        <HStack spacing={1.5}>
          {citation.url && (
            <Tooltip label="Open source">
              <Link href={citation.url} isExternal onClick={(e) => e.stopPropagation()}>
                <Icon as={FiExternalLink} boxSize={3.5} color={linkColor} />
              </Link>
            </Tooltip>
          )}
          <Icon as={isExpanded ? FiChevronDown : FiChevronRight} boxSize={3.5} color={mutedColor} />
        </HStack>
      </HStack>

      {/* Expandable Content */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={1.5} px={3} py={2} borderTopWidth="1px" borderColor={borderColor}>
          {citation.snippet && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={0.5}>
                Excerpt
              </Text>
              <Text fontSize="sm" lineHeight="1.6" color={textColor}>
                {citation.snippet}
              </Text>
            </Box>
          )}
          
          {citation.author && (
            <HStack spacing={1.5} fontSize="xs">
              <Text fontWeight="semibold" color={mutedColor}>Author:</Text>
              <Text>{citation.author}</Text>
            </HStack>
          )}
          
          {citation.url && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={0.5}>
                URL
              </Text>
              <Link href={citation.url} isExternal color={linkColor} fontSize="xs" wordBreak="break-all">
                {citation.url}
              </Link>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
}

/**
 * Container for multiple citations
 */
interface ResearchCitationsContainerProps {
  citations: Citation[];
  title?: string;
  defaultExpandFirst?: boolean;
}

export function ResearchCitationsContainer({ 
  citations, 
  title = 'Citations & Sources',
  defaultExpandFirst = false 
}: ResearchCitationsContainerProps) {
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');
  const bgColor = useSemanticToken('surface.base');

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <Box borderTopWidth="1px" borderColor={borderColor} pt={3} mt={3}>
      <HStack mb={2} px={2} py={1.5} bg={bgColor} borderRadius="md">
        <Icon as={FiFileText} boxSize={3.5} color={mutedColor} />
        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
          {title} ({citations.length})
        </Text>
      </HStack>
      <VStack align="stretch" spacing={1.5}>
        {citations.map((citation, index) => (
          <ResearchCitationCard 
            key={index} 
            citation={citation} 
            index={index}
            defaultExpanded={defaultExpandFirst && index === 0}
          />
        ))}
      </VStack>
    </Box>
  );
}
