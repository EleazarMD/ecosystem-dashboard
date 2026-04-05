/**
 * Citation Card Component
 * 
 * Displays academic citations in a clean, card-based format
 * Supports multiple citation styles: APA, MLA, Chicago, IEEE
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  Text,
  Badge,
  HStack,
  VStack,
  Icon,
  IconButton,
  Link,
  Collapse,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiExternalLink,
  FiCopy,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';

export interface Citation {
  id: number;
  authors: string[];
  year: number;
  title: string;
  source: string; // Journal name, conference, book
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  type?: 'journal' | 'conference' | 'book' | 'web' | 'report';
}

interface CitationCardProps {
  citation: Citation;
  style?: 'apa' | 'mla' | 'chicago' | 'ieee';
  compact?: boolean;
  showCopyButton?: boolean;
  onCopy?: (formatted: string) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  style = 'apa',
  compact = false,
  showCopyButton = true,
  onCopy,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const linkColor = 'blue.500';
  const expandedBg = useSemanticToken('surface.highlight');

  const formattedCitation = formatCitation(citation, style);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCitation);
      setCopySuccess(true);
      onCopy?.(formattedCitation);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  };

  if (compact) {
    return (
      <Box
        p={2}
        bg={bgColor}
        borderLeft="3px solid"
        borderColor={borderColor}
        fontSize="sm"
      >
        <HStack justify="space-between">
          <Text flex={1}>{formattedCitation}</Text>
          {showCopyButton && (
            <Tooltip label={copySuccess ? 'Copied!' : 'Copy citation'}>
              <IconButton
                aria-label="Copy citation"
                icon={<Icon as={FiCopy} />}
                size="xs"
                variant="ghost"
                onClick={handleCopy}
                colorScheme={copySuccess ? 'green' : 'gray'}
              />
            </Tooltip>
          )}
        </HStack>
      </Box>
    );
  }

  return (
    <Card size="sm" variant="outline">
      <CardBody>
        <VStack align="stretch" spacing={3}>
          {/* Citation Number & Type Badge */}
          <HStack justify="space-between">
            <HStack>
              <Badge colorScheme="blue" fontSize="sm">
                [{citation.id}]
              </Badge>
              {citation.type && (
                <Badge variant="outline" fontSize="xs">
                  {citation.type}
                </Badge>
              )}
            </HStack>
            <HStack spacing={1}>
              {citation.doi && (
                <Tooltip label="View on publisher site">
                  <IconButton
                    aria-label="Open DOI link"
                    icon={<Icon as={FiExternalLink} />}
                    size="xs"
                    variant="ghost"
                    as="a"
                    href={`https://doi.org/${citation.doi}`}
                    target="_blank"
                  />
                </Tooltip>
              )}
              {citation.url && !citation.doi && (
                <Tooltip label="View source">
                  <IconButton
                    aria-label="Open URL"
                    icon={<Icon as={FiExternalLink} />}
                    size="xs"
                    variant="ghost"
                    as="a"
                    href={citation.url}
                    target="_blank"
                  />
                </Tooltip>
              )}
              {showCopyButton && (
                <Tooltip label={copySuccess ? 'Copied!' : 'Copy citation'}>
                  <IconButton
                    aria-label="Copy citation"
                    icon={<Icon as={FiCopy} />}
                    size="xs"
                    variant="ghost"
                    onClick={handleCopy}
                    colorScheme={copySuccess ? 'green' : 'gray'}
                  />
                </Tooltip>
              )}
              {citation.abstract && (
                <Tooltip label={isExpanded ? 'Collapse' : 'Show abstract'}>
                  <IconButton
                    aria-label="Toggle abstract"
                    icon={<Icon as={isExpanded ? FiChevronUp : FiChevronDown} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>

          {/* Formatted Citation */}
          <Text fontSize="sm" lineHeight="tall">
            {formattedCitation}
          </Text>

          {/* DOI/URL Link */}
          {(citation.doi || citation.url) && (
            <HStack fontSize="xs" color={linkColor}>
              <Icon as={FiBookOpen} />
              <Link
                href={citation.doi ? `https://doi.org/${citation.doi}` : citation.url}
                isExternal
                fontWeight="medium"
              >
                {citation.doi || citation.url}
              </Link>
            </HStack>
          )}

          {/* Expandable Abstract */}
          {citation.abstract && (
            <Collapse in={isExpanded} animateOpacity>
              <Box
                p={3}
                bg={expandedBg}
                borderRadius="md"
                fontSize="sm"
              >
                <Text fontWeight="semibold" mb={2}>
                  Abstract:
                </Text>
                <Text>{citation.abstract}</Text>
              </Box>
            </Collapse>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

// ============================================================================
// CITATION FORMATTING
// ============================================================================

function formatCitation(citation: Citation, style: 'apa' | 'mla' | 'chicago' | 'ieee'): string {
  switch (style) {
    case 'apa':
      return formatAPA(citation);
    case 'mla':
      return formatMLA(citation);
    case 'chicago':
      return formatChicago(citation);
    case 'ieee':
      return formatIEEE(citation);
    default:
      return formatAPA(citation);
  }
}

function formatAPA(citation: Citation): string {
  const authors = formatAuthorsAPA(citation.authors);
  let formatted = `${authors} (${citation.year}). ${citation.title}. `;
  formatted += `*${citation.source}*`;

  if (citation.volume) {
    formatted += `, *${citation.volume}*`;
  }
  if (citation.issue) {
    formatted += `(${citation.issue})`;
  }
  if (citation.pages) {
    formatted += `, ${citation.pages}`;
  }
  formatted += '.';

  if (citation.doi) {
    formatted += ` https://doi.org/${citation.doi}`;
  }

  return formatted;
}

function formatMLA(citation: Citation): string {
  const authors = formatAuthorsMLA(citation.authors);
  let formatted = `${authors} "${citation.title}." `;
  formatted += `*${citation.source}*`;

  if (citation.volume) {
    formatted += `, vol. ${citation.volume}`;
  }
  if (citation.issue) {
    formatted += `, no. ${citation.issue}`;
  }
  formatted += `, ${citation.year}`;
  if (citation.pages) {
    formatted += `, pp. ${citation.pages}`;
  }
  formatted += '.';

  if (citation.doi) {
    formatted += ` doi:${citation.doi}.`;
  }

  return formatted;
}

function formatChicago(citation: Citation): string {
  const authors = formatAuthorsChicago(citation.authors);
  let formatted = `${authors} "${citation.title}." `;
  formatted += `*${citation.source}*`;

  if (citation.volume) {
    formatted += ` ${citation.volume}`;
  }
  if (citation.issue) {
    formatted += `, no. ${citation.issue}`;
  }
  formatted += ` (${citation.year})`;
  if (citation.pages) {
    formatted += `: ${citation.pages}`;
  }
  formatted += '.';

  if (citation.doi) {
    formatted += ` https://doi.org/${citation.doi}.`;
  }

  return formatted;
}

function formatIEEE(citation: Citation): string {
  const authors = formatAuthorsIEEE(citation.authors);
  let formatted = `${authors} "${citation.title}," `;
  formatted += `*${citation.source}*`;

  if (citation.volume) {
    formatted += `, vol. ${citation.volume}`;
  }
  if (citation.issue) {
    formatted += `, no. ${citation.issue}`;
  }
  if (citation.pages) {
    formatted += `, pp. ${citation.pages}`;
  }
  formatted += `, ${citation.year}.`;

  if (citation.doi) {
    formatted += ` doi: ${citation.doi}.`;
  }

  return formatted;
}

// ============================================================================
// AUTHOR FORMATTING
// ============================================================================

function formatAuthorsAPA(authors: string[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return formatAuthorLastFirst(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorLastFirst(authors[0])} & ${formatAuthorLastFirst(authors[1])}`;
  }
  // 3+ authors: List all in APA 7th edition
  const formatted = authors.slice(0, -1).map(formatAuthorLastFirst).join(', ');
  return `${formatted}, & ${formatAuthorLastFirst(authors[authors.length - 1])}`;
}

function formatAuthorsMLA(authors: string[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return formatAuthorLastFirst(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorLastFirst(authors[0])}, and ${authors[1]}`;
  }
  return `${formatAuthorLastFirst(authors[0])}, et al.`;
}

function formatAuthorsChicago(authors: string[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return formatAuthorLastFirst(authors[0]);
  if (authors.length === 2) {
    return `${formatAuthorLastFirst(authors[0])}, and ${authors[1]}`;
  }
  const formatted = authors.slice(0, -1).map(formatAuthorLastFirst).join(', ');
  return `${formatted}, and ${authors[authors.length - 1]}`;
}

function formatAuthorsIEEE(authors: string[]): string {
  if (authors.length === 0) return 'Unknown';
  if (authors.length === 1) return formatAuthorFirstInitial(authors[0]);
  if (authors.length <= 6) {
    const formatted = authors.slice(0, -1).map(formatAuthorFirstInitial).join(', ');
    return `${formatted}, and ${formatAuthorFirstInitial(authors[authors.length - 1])}`;
  }
  return `${formatAuthorFirstInitial(authors[0])}, et al.`;
}

function formatAuthorLastFirst(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const firstNames = parts.slice(0, -1).join(' ');
  return `${lastName}, ${firstNames}`;
}

function formatAuthorFirstInitial(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map(n => n.charAt(0).toUpperCase() + '.')
    .join(' ');
  return `${initials} ${lastName}`;
}

export default CitationCard;
