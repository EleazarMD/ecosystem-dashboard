import React, { useState } from 'react';
import { Box, Text, VStack, HStack, Link, Badge, Divider, Heading, Collapse, IconButton, Code } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLinkIcon, ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FiTerminal } from 'react-icons/fi';
import DeepResearchPlanCard from './DeepResearchPlanCard';

interface MessageContentRendererProps {
  content: string;
  citations?: Array<{
    number: number;
    url: string;
    title?: string;
  }>;
  isDeepResearchPlan?: boolean;
  isPlanApproved?: boolean;
  onApprovePlan?: () => void;
  onRevisePlan?: (feedback: string) => void;
}

/**
 * Enhanced message renderer that detects structured content
 * and renders it with rich UI components like Goose desktop app
 */
export const MessageContentRenderer: React.FC<MessageContentRendererProps> = ({
  content,
  citations,
  isDeepResearchPlan = false,
  isPlanApproved = false,
  onApprovePlan,
  onRevisePlan,
}) => {
  // Strip <think> tags from Perplexity Deep Research responses
  let cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Detect tool calls: ─── tool_name | provider ───────────────────────
  const toolCallMatch = cleanedContent.match(/^───\s+([^\|]+)\s+\|\s+([^\s]+)\s+───+/);
  const hasToolCall = !!toolCallMatch;

  // Detect if content has structured data patterns
  // More specific weather detection to avoid false positives
  const hasWeatherKeywords = /(Temperature:|Condition:|Humidity:|Pressure:|°F|°C|RealFeel|Feels Like|Wind Speed|UV Index)/i.test(cleanedContent);
  const hasWeatherStructure = /Temperature:.*\n.*Condition:/i.test(cleanedContent); // Must have temperature AND condition
  const hasWeatherData = hasWeatherKeywords && hasWeatherStructure;

  // Detect news/search results: multiple markdown links with descriptions
  const markdownLinkCount = (cleanedContent.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;
  const hasNumberedList = /^\d+\.\s+/m.test(cleanedContent);
  const hasMultipleLinks = markdownLinkCount >= 2; // At least 2 links

  // Check for search result indicators
  const hasSearchIndicators =
    /latest|recent|news|articles|information|search|results|sources/i.test(cleanedContent) ||
    cleanedContent.includes('OpenAI') ||
    cleanedContent.includes('Meta') ||
    cleanedContent.includes('AI') ||
    hasNumberedList;

  // Detect Deep Research Plan
  const isPlanContent =
    isDeepResearchPlan ||
    /research plan/i.test(cleanedContent) ||
    (/Research Questions|Search Strategy|Methodology|Deliverables/i.test(cleanedContent) && cleanedContent.length > 500) ||
    (/Does this (?:research )?plan look good\?.*(?:yes|approved)/i.test(cleanedContent));

  // Debug logging
  console.log('[MessageContentRenderer] Detection:', {
    hasToolCall,
    hasWeatherKeywords,
    hasWeatherStructure,
    hasWeatherData,
    markdownLinkCount,
    hasMultipleLinks,
    hasSearchIndicators,
    isPlanContent,
    willRenderCards: hasMultipleLinks && hasSearchIndicators,
  });

  // Render Deep Research Plan Card
  if (isPlanContent && onApprovePlan && onRevisePlan) {
    console.log('[MessageContentRenderer] Rendering DeepResearchPlanCard, approved:', isPlanApproved);
    return (
      <DeepResearchPlanCard
        content={cleanedContent}
        onApprove={onApprovePlan}
        onRevise={onRevisePlan}
        isApproved={isPlanApproved}
      />
    );
  }

  // Parse tool call if present
  if (hasToolCall) {
    return <ToolCallCard content={cleanedContent} />;
  }

  // Parse weather data if present
  if (hasWeatherData) {
    return <WeatherCard content={cleanedContent} />;
  }

  // Parse news/search results if present (multiple links with context)
  if (hasMultipleLinks && hasSearchIndicators) {
    console.log('[MessageContentRenderer] Rendering NewsResultsCard');
    return <NewsResultsCard content={cleanedContent} />;
  }

  // Default: render as markdown with consistent formatting
  return (
    <Box w="full" overflow="visible">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style links to look like Goose desktop
          a: ({ node, ...props }) => (
            <Link
              color="blue.400"
              textDecoration="underline"
              _hover={{ color: 'blue.300' }}
              isExternal
              {...props}
            >
              {props.children}
              <ExternalLinkIcon mx="2px" mb="2px" />
            </Link>
          ),
          // Style headings - refined modern sizes
          h1: ({ node, ...props }) => (
            <Heading
              as="h1"
              size="sm"
              mt={2}
              mb={1}
              fontWeight="600"
              lineHeight="1.3"
              fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              letterSpacing="-0.01em"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <Heading
              as="h2"
              size="xs"
              mt={1.5}
              mb={0.5}
              fontWeight="600"
              lineHeight="1.3"
              fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <Heading as="h3" size="sm" mt={1} mb={0.5} fontWeight="semibold" lineHeight="1.3" {...props} />
          ),
          // Style paragraphs with compact spacing
          p: ({ node, ...props }) => (
            <Text as="p" my={0.5} lineHeight="1.5" display="block" {...props} />
          ),
          // Style lists with compact spacing
          ul: ({ node, ...props }) => (
            <Box as="ul" pl={5} my={1} listStyleType="disc" listStylePosition="outside" display="block" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <Box as="ol" pl={5} my={1} listStyleType="decimal" listStylePosition="outside" display="block" {...props} />
          ),
          li: ({ node, ...props }) => (
            <Box as="li" my={0.25} py={0} lineHeight="1.5" display="list-item" {...props} />
          ),
          // Style code blocks - compact
          code: ({ node, ...props }: any) =>
            props.inline ? (
              <Code fontSize="sm" px={1} py={0.5} borderRadius="md" {...props} />
            ) : (
              <Code display="block" p={2} borderRadius="md" fontSize="sm" whiteSpace="pre-wrap" {...props} />
            ),
          // Style blockquotes - compact
          blockquote: ({ node, ...props }) => (
            <Box
              as="blockquote"
              borderLeft="3px solid"
              borderColor="blue.400"
              pl={3}
              my={1}
              py={0.5}
              fontStyle="italic"
              opacity={0.9}
              {...props}
            />
          ),
          // Style strong/bold text
          strong: ({ node, ...props }) => (
            <Text as="strong" fontWeight="700" {...props} />
          ),
        }}
      >
        {cleanedContent}
      </ReactMarkdown>

      {/* Render Perplexity citations if available */}
      {citations && citations.length > 0 && (
        <Box mt={4} pt={3} borderTop="1px solid" borderColor={useSemanticToken('border.subtle')}>
          <Text fontSize="xs" fontWeight="semibold" color={useSemanticToken('text.tertiary')} mb={2}>
            Sources
          </Text>
          <VStack align="stretch" spacing={1}>
            {citations.map((citation) => (
              <Link
                key={citation.number}
                href={citation.url}
                isExternal
                fontSize="xs"
                color="blue.400"
                display="flex"
                alignItems="center"
                gap={2}
                _hover={{ color: 'blue.300' }}
              >
                <Badge colorScheme="blue" fontSize="2xs">{citation.number}</Badge>
                {citation.title || citation.url}
                <ExternalLinkIcon boxSize={3} />
              </Link>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

/**
 * Weather Card Component - styled exactly like Goose desktop
 */
const WeatherCard: React.FC<{ content: string }> = ({ content }) => {
  // Just render as clean markdown with weather-specific styling
  return (
    <Box>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <Heading as="h1" size="md" mt={2} mb={3} {...props} />
          ),
          h2: ({ node, ...props }) => (
            <Heading as="h2" size="sm" mt={3} mb={2} fontWeight="semibold" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <Heading as="h3" size="sm" mt={2} mb={2} fontWeight="semibold" {...props} />
          ),
          p: ({ node, ...props }) => (
            <Text my={1} lineHeight="1.6" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <Box as="ul" pl={0} my={2} listStyleType="none" {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <Box as="li" my={0} py={0.5} {...props}>
              <HStack spacing={2} alignItems="flex-start">
                <Text color={useSemanticToken('text.secondary')} fontSize="lg" lineHeight="1.6">•</Text>
                <Text flex="1" lineHeight="1.6">{children}</Text>
              </HStack>
            </Box>
          ),
          strong: ({ node, ...props }) => (
            <Text as="strong" fontWeight="600" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

/**
 * News Results Card - styled like Goose desktop with proper link formatting
 */
const NewsResultsCard: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const introLines: string[] = [];
  const newsItems: Array<{ title: string; url: string; description?: string }> = [];
  const closingLines: string[] = [];

  let inNewsList = false;
  let currentItem: { title: string; url: string; description?: string } | null = null;

  lines.forEach((line, index) => {
    // Match numbered list items with markdown links: 1. [Title](URL) or just [Title](URL)
    const linkMatch = line.match(/^(?:\d+\.\s+)?\[(.+?)\]\((.+?)\)/);

    // Also match bullet points: - [Title](URL) or * [Title](URL)
    const bulletMatch = line.match(/^[\-\*]\s+\[(.+?)\]\((.+?)\)/);

    const match = linkMatch || bulletMatch;

    if (match) {
      inNewsList = true;
      if (currentItem) newsItems.push(currentItem);
      currentItem = {
        title: match[1],
        url: match[2],
      };
    } else if (inNewsList && line.trim() && !line.match(/^Sources/i) && !line.match(/^\[.*?\]\(/)) {
      // Description line (not a link itself)
      if (currentItem && !currentItem.description) {
        currentItem.description = line.trim();
      }
    } else if (!inNewsList && line.trim()) {
      introLines.push(line);
    } else if (line.match(/^Sources/i)) {
      if (currentItem) {
        newsItems.push(currentItem);
        currentItem = null;
      }
      inNewsList = false;
      closingLines.push(line);
    } else if (!inNewsList && line.trim() && newsItems.length > 0) {
      closingLines.push(line);
    }
  });

  if (currentItem) newsItems.push(currentItem);

  return (
    <VStack align="stretch" spacing={4}>
      {/* Introduction */}
      {introLines.length > 0 && (
        <Box>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {introLines.join('\n')}
          </ReactMarkdown>
        </Box>
      )}

      {/* News items as cards - Goose Desktop style */}
      <VStack align="stretch" spacing={2}>
        {newsItems.map((item, idx) => (
          <Box
            key={idx}
            bg={useSemanticToken('surface.elevated')}
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor={useSemanticToken('border.subtle')}
            _hover={{ bg: useSemanticToken('surface.hover'), borderColor: useSemanticToken('border.default') }}
            transition="all 0.15s"
          >
            <HStack align="flex-start" spacing={3}>
              <Badge
                colorScheme="blue"
                fontSize="xs"
                px={2}
                py={0.5}
                borderRadius="md"
                fontWeight="700"
              >
                {idx + 1}
              </Badge>
              <VStack align="stretch" spacing={1.5} flex={1}>
                <Link
                  href={item.url}
                  isExternal
                  color={useSemanticToken('text.primary')}
                  fontWeight="600"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={1}
                  _hover={{ color: 'blue.300' }}
                  transition="color 0.15s"
                >
                  {item.title}
                  <ExternalLinkIcon boxSize={3} />
                </Link>
                {item.description && (
                  <Text fontSize="xs" color={useSemanticToken('text.tertiary')} lineHeight="1.5">
                    {item.description}
                  </Text>
                )}
              </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Closing/sources */}
      {closingLines.length > 0 && (
        <>
          <Divider borderColor={useSemanticToken('border.subtle')} />
          <Box fontSize="sm" color={useSemanticToken('text.tertiary')}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {closingLines.join('\n')}
            </ReactMarkdown>
          </Box>
        </>
      )}
    </VStack>
  );
};

/**
 * Tool Call Card - Goose Desktop Style
 * Renders tool calls with collapsible details and output
 */
const ToolCallCard: React.FC<{ content: string }> = ({ content }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  // Parse tool call header: ─── tool_name | provider ───────────────────────
  const headerMatch = content.match(/^───\s+([^\|]+)\s+\|\s+([^\s]+)\s+───+/);
  const toolName = headerMatch?.[1]?.trim() || 'unknown_tool';
  const provider = headerMatch?.[2]?.trim() || 'unknown';

  // Split content into sections
  const lines = content.split('\n');
  const toolDetailsLines: string[] = [];
  const outputLines: string[] = [];
  let inToolDetails = false;
  let inOutput = false;

  lines.forEach((line, idx) => {
    if (idx === 0) return; // Skip header

    // Tool details are the parameters right after the header
    if (!inOutput && line.trim() && !line.match(/^(The|It seems|Here|Successfully|Failed)/)) {
      inToolDetails = true;
      toolDetailsLines.push(line);
    } else if (line.trim() && !inToolDetails) {
      inOutput = true;
      outputLines.push(line);
    } else if (inOutput) {
      outputLines.push(line);
    }
  });

  const toolDetails = toolDetailsLines.join('\n').trim();
  const output = outputLines.join('\n').trim();

  return (
    <VStack align="stretch" spacing={3}>
      {/* Tool Call Box */}
      <Box
        bg={useSemanticToken('surface.elevated')}
        borderRadius="md"
        border="1px solid"
        borderColor={useSemanticToken('border.subtle')}
        overflow="hidden"
      >
        {/* Header with tool icon and name */}
        <HStack
          bg={useSemanticToken('surface.raised')}
          px={4}
          py={2}
          borderBottom="1px solid"
          borderColor={useSemanticToken('border.subtle')}
        >
          <FiTerminal />
          <Text fontSize="sm" fontWeight="600" fontFamily="mono">
            {toolName}
          </Text>
          <Badge colorScheme="purple" fontSize="xs">
            {provider}
          </Badge>
        </HStack>

        {/* Tool Details - Collapsible */}
        <Box>
          <HStack
            px={4}
            py={2}
            cursor="pointer"
            onClick={() => setShowDetails(!showDetails)}
            _hover={{ bg: useSemanticToken('surface.hover') }}
            transition="all 0.15s"
          >
            <IconButton
              icon={showDetails ? <ChevronDownIcon /> : <ChevronRightIcon />}
              size="xs"
              variant="ghost"
              aria-label="Toggle details"
            />
            <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.tertiary')}>
              Tool Details
            </Text>
          </HStack>
          <Collapse in={showDetails}>
            <Box px={4} pb={3}>
              <Code
                display="block"
                whiteSpace="pre-wrap"
                fontSize="xs"
                p={3}
                borderRadius="md"
                bg={useSemanticToken('surface.raised')}
                fontFamily="mono"
              >
                {toolDetails || 'No parameters'}
              </Code>
            </Box>
          </Collapse>
        </Box>

        {/* Output - Collapsible */}
        {output && (
          <Box borderTop="1px solid" borderColor={useSemanticToken('border.subtle')}>
            <HStack
              px={4}
              py={2}
              cursor="pointer"
              onClick={() => setShowOutput(!showOutput)}
              _hover={{ bg: useSemanticToken('surface.hover') }}
              transition="all 0.15s"
            >
              <IconButton
                icon={showOutput ? <ChevronDownIcon /> : <ChevronRightIcon />}
                size="xs"
                variant="ghost"
                aria-label="Toggle output"
              />
              <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.tertiary')}>
                Output
              </Text>
            </HStack>
            <Collapse in={showOutput}>
              <Box px={4} pb={3}>
                <Box
                  fontSize="sm"
                  p={3}
                  borderRadius="md"
                  bg={useSemanticToken('surface.raised')}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {output}
                  </ReactMarkdown>
                </Box>
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {/* Main response content (after the tool call) */}
      {output && (
        <Box>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {output}
          </ReactMarkdown>
        </Box>
      )}
    </VStack>
  );
};
