/**
 * Tool Usage Display Component
 * Shows which MCP tools were used by Goose agent
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Collapse,
  useDisclosure,
  IconButton,
  Code,
} from '@chakra-ui/react';
import {
  FiTool,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiClock,
} from 'react-icons/fi';

export interface ToolUsage {
  tool: string;
  input?: any;
  output?: any;
  duration?: number;
  status?: 'success' | 'error';
}

interface ToolUsageDisplayProps {
  tools: ToolUsage[];
  compact?: boolean;
}

export function ToolUsageDisplay({ tools, compact = false }: ToolUsageDisplayProps) {
  const { isOpen, onToggle } = useDisclosure();
  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');
  const codeBg = useSemanticToken('surface.elevated');

  if (!tools || tools.length === 0) {
    return null;
  }

  // Group tools by name to show count
  const toolCounts = tools.reduce((acc, tool) => {
    const name = tool.tool.split('.')[0]; // Get base name (e.g., "workspace" from "workspace.get_page")
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (compact) {
    return (
      <HStack
        spacing={2}
        p={2}
        bg={bgColor}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
        fontSize="xs"
      >
        <Icon as={FiTool} boxSize={3} color="blue.500" />
        <Text fontWeight="600" color={textColor}>
          Tools used:
        </Text>
        {Object.entries(toolCounts).map(([tool, count]) => (
          <Badge key={tool} colorScheme="blue" fontSize="xs">
            {tool} {count > 1 && `(${count})`}
          </Badge>
        ))}
      </HStack>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
    >
      <HStack
        p={2}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: hoverBg }}
      >
        <Icon as={FiTool} boxSize={4} color="blue.500" />
        <Text fontSize="sm" fontWeight="600" color={textColor} flex={1}>
          🔧 Tools Used ({tools.length})
        </Text>
        <HStack spacing={1}>
          {Object.entries(toolCounts).slice(0, 3).map(([tool, count]) => (
            <Badge key={tool} colorScheme="blue" fontSize="xs">
              {tool} {count > 1 && `×${count}`}
            </Badge>
          ))}
          {Object.keys(toolCounts).length > 3 && (
            <Text fontSize="xs" color={mutedColor}>
              +{Object.keys(toolCounts).length - 3} more
            </Text>
          )}
        </HStack>
        <IconButton
          aria-label="Toggle details"
          icon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
          size="xs"
          variant="ghost"
        />
      </HStack>

      <Collapse in={isOpen}>
        <VStack spacing={2} p={3} pt={0} align="stretch">
          {tools.map((tool, idx) => (
            <Box
              key={idx}
              p={2}
              bg={useSemanticToken('surface.elevated')}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Icon
                    as={tool.status === 'error' ? FiTool : FiCheck}
                    boxSize={3}
                    color={tool.status === 'error' ? 'red.500' : 'green.500'}
                  />
                  <Code fontSize="xs" colorScheme="blue">
                    {tool.tool}
                  </Code>
                </HStack>
                {tool.duration && (
                  <HStack spacing={1}>
                    <Icon as={FiClock} boxSize={3} color={mutedColor} />
                    <Text fontSize="xs" color={mutedColor}>
                      {tool.duration}ms
                    </Text>
                  </HStack>
                )}
              </HStack>

              {tool.input && (
                <Box mt={1}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="600">
                    Input:
                  </Text>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    fontSize="xs"
                    p={2}
                    mt={1}
                    bg={codeBg}
                  >
                    {typeof tool.input === 'string'
                      ? tool.input
                      : JSON.stringify(tool.input, null, 2)}
                  </Code>
                </Box>
              )}

              {tool.output && (
                <Box mt={1}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="600">
                    Output:
                  </Text>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    fontSize="xs"
                    p={2}
                    mt={1}
                    bg={codeBg}
                  >
                    {typeof tool.output === 'string'
                      ? tool.output
                      : JSON.stringify(tool.output, null, 2)}
                  </Code>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
}
