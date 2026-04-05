/**
 * Professional Research Output Formatter
 * Parses and displays Deep Research results with:
 * - Formatted content sections
 * - Collapsible tool execution logs
 * - Enhanced citation cards
 * - Token usage and metadata
 */

import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Divider,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Heading,
} from '@chakra-ui/react';
import { FiInfo, FiClock, FiZap, FiDatabase } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { ResearchToolsContainer, ToolExecution } from './ResearchToolCard';
import { ResearchCitationsContainer, Citation } from './ResearchCitationCard';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface ResearchMetadata {
  tools_used?: ToolExecution[];
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  duration_seconds?: number;
  citations?: Citation[];
}

interface ResearchOutputFormatterProps {
  content: string;
  metadata?: ResearchMetadata;
  showMetadata?: boolean;
}

/**
 * Extract citations from markdown-style references
 * Looks for patterns like [1], [2], etc. and accompanying reference lists
 */
function extractCitations(content: string): Citation[] {
  const citations: Citation[] = [];
  
  // Pattern 1: Markdown reference style [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    citations.push({
      title: match[1],
      url: match[2],
      type: 'website',
    });
  }
  
  // Pattern 2: Reference section with numbered citations
  const refSectionRegex = /(?:##?\s*(?:References|Sources|Citations)[\s\S]*?)(?:\n(?:\d+\.|•)\s*(.+?)(?:\n|$))/gi;
  const refMatches = content.match(refSectionRegex);
  
  if (refMatches) {
    refMatches.forEach(ref => {
      const titleMatch = ref.match(/(?:\d+\.|•)\s*(.+?)(?:\s*-\s*|\s*\(|$)/);
      const urlMatch = ref.match(/(https?:\/\/[^\s\)]+)/);
      
      if (titleMatch) {
        citations.push({
          title: titleMatch[1].trim(),
          url: urlMatch ? urlMatch[1] : undefined,
          type: 'article',
        });
      }
    });
  }
  
  return citations;
}

/**
 * Clean content by removing citation markers for cleaner display
 */
function cleanContent(content: string): string {
  // Remove inline citation numbers like [1], [2], etc.
  // but keep them if they're part of markdown links
  return content.replace(/\[(\d+)\](?!\()/g, '⁽$1⁾');
}

export function ResearchOutputFormatter({ 
  content, 
  metadata,
  showMetadata = true 
}: ResearchOutputFormatterProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const metadataBg = useSemanticToken('surface.base');
  const mutedColor = useSemanticToken('text.secondary');
  const codeBg = useSemanticToken('surface.hover');
  const blockquoteBorderColor = useSemanticToken('border.subtle');

  // Extract citations from content or use provided metadata
  const citations = useMemo(() => {
    if (metadata?.citations && metadata.citations.length > 0) {
      return metadata.citations;
    }
    return extractCitations(content);
  }, [content, metadata?.citations]);

  // Clean content for display
  const displayContent = useMemo(() => cleanContent(content), [content]);

  // Calculate stats
  const totalTokens = metadata?.token_usage?.total_tokens || 0;
  const duration = metadata?.duration_seconds || 0;
  const toolCount = metadata?.tools_used?.length || 0;

  return (
    <VStack align="stretch" spacing={4} w="full">
      {/* Metadata Summary */}
      {showMetadata && (metadata || citations.length > 0) && (
        <Box bg={metadataBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <HStack mb={3}>
            <Icon as={FiInfo} boxSize={4} color={mutedColor} />
            <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
              Research Metadata
            </Text>
          </HStack>
          
          <StatGroup>
            {duration > 0 && (
              <Stat>
                <StatLabel fontSize="xs" color={mutedColor}>
                  <HStack spacing={1}>
                    <Icon as={FiClock} boxSize={3} />
                    <Text>Duration</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="md">{duration.toFixed(1)}s</StatNumber>
              </Stat>
            )}
            
            {totalTokens > 0 && (
              <Stat>
                <StatLabel fontSize="xs" color={mutedColor}>
                  <HStack spacing={1}>
                    <Icon as={FiZap} boxSize={3} />
                    <Text>Tokens</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="md">{totalTokens.toLocaleString()}</StatNumber>
              </Stat>
            )}
            
            {toolCount > 0 && (
              <Stat>
                <StatLabel fontSize="xs" color={mutedColor}>
                  <HStack spacing={1}>
                    <Icon as={FiDatabase} boxSize={3} />
                    <Text>Tools Used</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="md">{toolCount}</StatNumber>
              </Stat>
            )}
            
            {citations.length > 0 && (
              <Stat>
                <StatLabel fontSize="xs" color={mutedColor}>
                  <HStack spacing={1}>
                    <Icon as={FiInfo} boxSize={3} />
                    <Text>Citations</Text>
                  </HStack>
                </StatLabel>
                <StatNumber fontSize="md">{citations.length}</StatNumber>
              </Stat>
            )}
          </StatGroup>
          
          {metadata?.model && (
            <HStack mt={2} spacing={2}>
              <Text fontSize="xs" color={mutedColor}>Model:</Text>
              <Badge colorScheme="purple" fontSize="xs">{metadata.model}</Badge>
            </HStack>
          )}
        </Box>
      )}

      {/* Main Research Content */}
      <Box
        bg={bgColor}
        p={6}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={borderColor}
        className="research-content"
      >
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <Heading as="h1" size="xl" mb={4} mt={6} {...props} />
            ),
            h2: ({ node, ...props }) => (
              <Heading as="h2" size="lg" mb={3} mt={5} {...props} />
            ),
            h3: ({ node, ...props }) => (
              <Heading as="h3" size="md" mb={2} mt={4} {...props} />
            ),
            p: ({ node, ...props }) => (
              <Text mb={3} lineHeight="1.7" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <Box as="ul" pl={6} mb={3} {...props} />
            ),
            ol: ({ node, ...props }) => (
              <Box as="ol" pl={6} mb={3} {...props} />
            ),
            li: ({ node, ...props }) => (
              <Box as="li" mb={1} {...props} />
            ),
            code: ({ node, inline, ...props }: any) =>
              inline ? (
                <Text
                  as="code"
                  px={1}
                  py={0.5}
                  bg={codeBg}
                  borderRadius="sm"
                  fontSize="sm"
                  fontFamily="mono"
                  {...props}
                />
              ) : (
                <Box
                  as="pre"
                  p={3}
                  bg={codeBg}
                  borderRadius="md"
                  overflowX="auto"
                  mb={3}
                  fontSize="sm"
                  fontFamily="mono"
                >
                  <code {...props} />
                </Box>
              ),
            blockquote: ({ node, ...props }) => (
              <Box
                as="blockquote"
                pl={4}
                borderLeftWidth="3px"
                borderLeftColor={blockquoteBorderColor}
                color={mutedColor}
                fontStyle="italic"
                mb={3}
                {...props}
              />
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </Box>

      {/* Tool Execution Logs */}
      {metadata?.tools_used && metadata.tools_used.length > 0 && (
        <ResearchToolsContainer tools={metadata.tools_used} />
      )}

      {/* Citations Section */}
      {citations.length > 0 && (
        <ResearchCitationsContainer 
          citations={citations} 
          defaultExpandFirst={true}
        />
      )}
    </VStack>
  );
}
