/**
 * Graph Explorer Panel
 * Explore graph structure, statistics, and navigate relationships
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Divider,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiShare2,
  FiCircle,
  FiLink,
  FiLayers,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function GraphExplorerPanel() {
  const { customData } = useRightPanel();
  const graphStats = customData?.graphStats || {};
  const nodeTypes = customData?.nodeTypes || {};

  // Colors
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');

  const NODE_COLORS: Record<string, string> = {
    document: 'blue.400',
    topic: 'pink.400',
    concept: 'green.400',
    technique: 'teal.400',
    insight: 'yellow.400',
    chapter: 'purple.400',
  };

  return (
    <Box p={5} h="100%" overflowY="auto">
      <VStack spacing={5} align="stretch">
        {/* Header */}
        <HStack spacing={2}>
          <Icon as={FiShare2} color="green.400" boxSize={5} />
          <Heading size="sm" color={textColor}>Graph Explorer</Heading>
        </HStack>

        <Divider borderColor={borderColor} />

        {/* Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Box p={3} bg={cardBg} borderRadius="md">
            <VStack align="start" spacing={0}>
              <HStack spacing={1}>
                <Icon as={FiCircle} color="blue.400" boxSize={3} />
                <Text fontSize="xs" color={mutedColor}>Nodes</Text>
              </HStack>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {graphStats.total_nodes || 0}
              </Text>
            </VStack>
          </Box>
          <Box p={3} bg={cardBg} borderRadius="md">
            <VStack align="start" spacing={0}>
              <HStack spacing={1}>
                <Icon as={FiLink} color="green.400" boxSize={3} />
                <Text fontSize="xs" color={mutedColor}>Links</Text>
              </HStack>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {graphStats.total_links || 0}
              </Text>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Node Types Breakdown */}
        <VStack align="stretch" spacing={2}>
          <HStack spacing={2}>
            <Icon as={FiLayers} color="purple.400" />
            <Text fontWeight="600" color={textColor} fontSize="sm">Node Types</Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            {Object.entries(nodeTypes).map(([type, count]) => (
              <HStack key={type} justify="space-between" p={2} bg={cardBg} borderRadius="md">
                <HStack spacing={2}>
                  <Box w={2} h={2} borderRadius="full" bg={NODE_COLORS[type] || 'gray.400'} />
                  <Text fontSize="sm" color={textColor} textTransform="capitalize">{type}</Text>
                </HStack>
                <Badge colorScheme={NODE_COLORS[type]?.split('.')[0] || 'gray'}>
                  {count as number}
                </Badge>
              </HStack>
            ))}
          </VStack>
        </VStack>

        {/* Instructions */}
        <Box p={3} bg={cardBg} borderRadius="md" borderLeft="3px solid" borderLeftColor="blue.400">
          <Text fontSize="xs" color={mutedColor}>
            Click on nodes in the graph to explore their details in the Graph Tutor tab. 
            Use the filters above the graph to focus on specific node types.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
