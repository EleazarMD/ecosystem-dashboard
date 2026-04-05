/**
 * Tool Execution Card Component - Goose UI Style
 * Inline, compact display with expandable sections
 * Matches the Goose CLI tool execution display pattern
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Collapse,
  Code,
  IconButton,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ToolExecutionCardProps {
  tool: {
    name: string;
    server?: string;
    duration_ms?: number;
    success?: boolean;
    error?: string | null;
    arguments?: Record<string, any>;
    result?: string | null;
  };
  index: number;
}

const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ tool, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showOutput, setShowOutput] = useState(true); // Output expanded by default

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');
  const sectionBg = useSemanticToken('surface.raised');

  // Map tool names to user-friendly display names with icons
  const getToolDisplay = (toolName: string) => {
    const toolMap: Record<string, { name: string; icon: string }> = {
      // Perplexity
      'perplexity_search': { name: 'Perplexity Search', icon: '🔍' },
      'perplexity_grounded_research': { name: 'Perplexity Research', icon: '🔬' },

      // OpenAI
      'openai_deep_research': { name: 'OpenAI Deep Research', icon: '🧠' },
      'openai_research': { name: 'OpenAI Research', icon: '💡' },

      // Gemini
      'gemini_grounded_research': { name: 'Gemini Research', icon: '✨' },
      'gemini_research': { name: 'Gemini Analysis', icon: '🌟' },

      // Workspace
      'workspace_create_page': { name: 'Created Page', icon: '📄' },
      'workspace_update_page': { name: 'Updated Page', icon: '✏️' },
      'workspace_create_database': { name: 'Created Database', icon: '📊' },
      'workspace_create_block': { name: 'Added Content', icon: '📝' },
      'workspace_search_pages': { name: 'Searched Pages', icon: '🔎' },

      // Web Search
      'tavily_search': { name: 'Web Search', icon: '🌐' },
    };

    return toolMap[toolName] || { name: toolName.replace(/_/g, ' '), icon: '🛠️' };
  };

  const toolDisplay = getToolDisplay(tool.name);

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get status text and color
  const getStatus = () => {
    if (tool.error) return { text: 'Failed', color: errorColor };
    if (tool.success) return { text: 'Running', color: successColor };
    return { text: 'Running', color: mutedColor };
  };

  const status = getStatus();
  const duration = formatDuration(tool.duration_ms);

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      mb={1.5}
      fontSize="sm"
    >
      {/* Main Header - Inline Tool Execution */}
      <HStack
        px={2.5}
        py={1.5}
        spacing={1.5}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: useSemanticToken('surface.hover') }}
        transition="background 0.2s"
      >
        <IconButton
          icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
          aria-label="Toggle sections"
          size="xs"
          variant="ghost"
          minW="auto"
          h="auto"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        />

        <Text fontSize="sm">
          {toolDisplay.icon}
        </Text>

        <Text color={textColor} fontSize="sm" flex="1" fontWeight="medium">
          {toolDisplay.name}
        </Text>

        {tool.success && !tool.error && (
          <Text fontSize="xs" color={successColor}>
            ✅
          </Text>
        )}

        {tool.error && (
          <Text fontSize="xs" color={errorColor}>
            ❌
          </Text>
        )}

        {duration && (
          <Text color={mutedColor} fontSize="xs" fontWeight="medium">
            {duration}
          </Text>
        )}
      </HStack>

      {/* Expandable Sections */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={0} borderTop="1px solid" borderColor={borderColor}>

          {/* Tool Details Section */}
          <Box>
            <HStack
              px={2.5}
              py={1.5}
              spacing={1.5}
              cursor="pointer"
              onClick={() => setShowToolDetails(!showToolDetails)}
              bg={sectionBg}
              borderBottom="1px solid"
              borderColor={borderColor}
              _hover={{ bg: useSemanticToken('surface.hover') }}
            >
              <IconButton
                icon={showToolDetails ? <FiChevronDown /> : <FiChevronRight />}
                aria-label="Toggle tool details"
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
              />
              <Text fontSize="xs" fontWeight="semibold" color={textColor}>
                Tool Details
              </Text>
            </HStack>
            <Collapse in={showToolDetails} animateOpacity>
              <Box px={2.5} py={1.5} borderBottom="1px solid" borderColor={borderColor}>
                <VStack align="stretch" spacing={0.5} fontSize="xs">
                  <HStack>
                    <Text color={mutedColor} w="80px">Tool Name:</Text>
                    <Text color={textColor}>{tool.name}</Text>
                  </HStack>
                  {tool.server && (
                    <HStack>
                      <Text color={mutedColor} w="80px">Server:</Text>
                      <Text color={textColor}>{tool.server}</Text>
                    </HStack>
                  )}
                  <HStack>
                    <Text color={mutedColor} w="80px">Duration:</Text>
                    <Text color={textColor}>{duration || 'N/A'}</Text>
                  </HStack>
                  <HStack>
                    <Text color={mutedColor} w="80px">Status:</Text>
                    <Text color={status.color}>{status.text}</Text>
                  </HStack>
                  {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                    <>
                      <Text color={mutedColor} mt={1.5}>Arguments:</Text>
                      <Code
                        display="block"
                        p={1.5}
                        borderRadius="sm"
                        fontSize="xs"
                        whiteSpace="pre-wrap"
                        bg={useSemanticToken('surface.elevated')}
                      >
                        {JSON.stringify(tool.arguments, null, 2)}
                      </Code>
                    </>
                  )}
                </VStack>
              </Box>
            </Collapse>
          </Box>

          {/* Logs Section (if error exists) */}
          {tool.error && (
            <Box>
              <HStack
                px={2.5}
                py={1.5}
                spacing={1.5}
                cursor="pointer"
                onClick={() => setShowLogs(!showLogs)}
                bg={sectionBg}
                borderBottom="1px solid"
                borderColor={borderColor}
                _hover={{ bg: useSemanticToken('surface.hover') }}
              >
                <IconButton
                  icon={showLogs ? <FiChevronDown /> : <FiChevronRight />}
                  aria-label="Toggle logs"
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  h="auto"
                />
                <Text fontSize="xs" fontWeight="semibold" color={errorColor}>
                  Logs
                </Text>
              </HStack>
              <Collapse in={showLogs} animateOpacity>
                <Box px={2.5} py={1.5} borderBottom="1px solid" borderColor={borderColor}>
                  <Code
                    display="block"
                    p={1.5}
                    borderRadius="sm"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    bg="red.50"
                    color="red.700"
                  >
                    {tool.error}
                  </Code>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Output Section */}
          {tool.result && (
            <Box>
              <HStack
                px={2.5}
                py={1.5}
                spacing={1.5}
                cursor="pointer"
                onClick={() => setShowOutput(!showOutput)}
                bg={sectionBg}
                _hover={{ bg: useSemanticToken('surface.hover') }}
              >
                <IconButton
                  icon={showOutput ? <FiChevronDown /> : <FiChevronRight />}
                  aria-label="Toggle output"
                  size="xs"
                  variant="ghost"
                  minW="auto"
                  h="auto"
                />
                <Text fontSize="xs" fontWeight="semibold" color={textColor}>
                  Output
                </Text>
              </HStack>
              <Collapse in={showOutput} animateOpacity>
                <Box px={2.5} py={1.5}>
                  <Code
                    display="block"
                    p={1.5}
                    borderRadius="sm"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    maxH="250px"
                    overflowY="auto"
                    bg={useSemanticToken('surface.elevated')}
                  >
                    {tool.result}
                  </Code>
                  {tool.result.length > 1000 && (
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      {tool.result.length.toLocaleString()} characters
                    </Text>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default ToolExecutionCard;
