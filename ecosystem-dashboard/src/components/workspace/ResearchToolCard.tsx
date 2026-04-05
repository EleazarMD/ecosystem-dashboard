/**
 * Collapsible Tool Execution Card
 * Shows tool name, duration, and expandable details
 */

import React, { useState } from 'react';
import {
  Box,
  Collapse,
  HStack,
  VStack,
  Text,
  Icon,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiTool, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface ToolExecution {
  name: string;
  status?: 'success' | 'error';
  duration?: number; // milliseconds
  input?: any;
  output?: string;
  error?: string;
}

interface ResearchToolCardProps {
  tool: ToolExecution;
  defaultExpanded?: boolean;
}

export function ResearchToolCard({ tool, defaultExpanded = false }: ResearchToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');
  const mutedColor = useSemanticToken('text.secondary');

  const statusColor = tool.status === 'success' ? successColor : tool.status === 'error' ? errorColor : mutedColor;
  const StatusIcon = tool.status === 'success' ? FiCheckCircle : tool.status === 'error' ? FiXCircle : FiTool;

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      transition="all 0.2s"
      _hover={{ borderColor: statusColor }}
    >
      {/* Header - Always Visible */}
      <HStack
        px={4}
        py={3}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: useSemanticToken('surface.hover') }}
      >
        <HStack spacing={3} flex={1}>
          <Icon as={StatusIcon} color={statusColor} boxSize={5} />
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="semibold" fontSize="sm">
              {tool.name}
            </Text>
            {tool.duration && (
              <HStack spacing={1} fontSize="xs" color={mutedColor}>
                <Icon as={FiClock} boxSize={3} />
                <Text>{(tool.duration / 1000).toFixed(2)}s</Text>
              </HStack>
            )}
          </VStack>

          {tool.status && (
            <Badge colorScheme={tool.status === 'success' ? 'green' : 'red'} fontSize="xs">
              {tool.status}
            </Badge>
          )}
        </HStack>

        <Icon as={isExpanded ? FiChevronDown : FiChevronRight} boxSize={5} color={mutedColor} />
      </HStack>

      {/* Expandable Details */}
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={3} px={4} py={3} borderTopWidth="1px" borderColor={borderColor}>
          {/* Input */}
          {tool.input && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                Input
              </Text>
              <Box
                bg={useSemanticToken('surface.elevated')}
                p={2}
                borderRadius="md"
                fontSize="xs"
                fontFamily="mono"
                overflowX="auto"
                maxH="150px"
                overflowY="auto"
              >
                <pre>{JSON.stringify(tool.input, null, 2)}</pre>
              </Box>
            </Box>
          )}

          {/* Output */}
          {tool.output && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                Output
              </Text>
              <Box
                bg={useSemanticToken('surface.elevated')}
                p={3}
                borderRadius="md"
                fontSize="sm"
                maxH="300px"
                overflowY="auto"
              >
                <Text whiteSpace="pre-wrap">{tool.output}</Text>
              </Box>
            </Box>
          )}

          {/* Error */}
          {tool.error && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={errorColor} mb={1}>
                Error
              </Text>
              <Box
                bg={useSemanticToken('status.errorBg')}
                p={2}
                borderRadius="md"
                fontSize="xs"
                fontFamily="mono"
              >
                <Text color={errorColor}>{tool.error}</Text>
              </Box>
            </Box>
          )}
        </VStack>
      </Collapse>
    </Box>
  );
}

/**
 * Container for multiple tool cards
 */
interface ResearchToolsContainerProps {
  tools: ToolExecution[];
  title?: string;
}

export function ResearchToolsContainer({ tools, title = 'Tools Used' }: ResearchToolsContainerProps) {
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');

  if (!tools || tools.length === 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={3} py={3}>
      <HStack>
        <Icon as={FiTool} boxSize={4} color={mutedColor} />
        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
          {title} ({tools.length})
        </Text>
      </HStack>
      <VStack align="stretch" spacing={2}>
        {tools.map((tool, index) => (
          <ResearchToolCard key={index} tool={tool} />
        ))}
      </VStack>
    </VStack>
  );
}
