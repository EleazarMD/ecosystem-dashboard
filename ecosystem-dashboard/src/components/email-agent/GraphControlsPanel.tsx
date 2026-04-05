/**
 * Graph Controls Panel
 * Right panel component for controlling email knowledge graph visualization
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  Switch,
  Divider,
  Badge,
  Button,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

const NODE_TYPES = {
  person: { label: 'Contacts', color: '#6366f1' },
  topic: { label: 'Topics', color: '#f59e0b' },
  sentiment: { label: 'Sentiments', color: '#10b981' },
  category: { label: 'Categories', color: '#8b5cf6' },
};

export default function GraphControlsPanel() {
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const { customData } = useRightPanel();

  // Extract data from customData passed by the graph page
  const {
    nodeLimit = 200,
    onNodeLimitChange,
    linkStrengthThreshold = 1,
    onLinkStrengthChange,
    visibleTypes = { person: true, topic: true, sentiment: true, category: true },
    onToggleType,
    stats,
  } = customData || {};

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Stats Overview */}
        {stats && (
          <Box>
            <Text fontWeight="600" color={textColor} mb={3}>Graph Stats</Text>
            <HStack justify="space-between" wrap="wrap" spacing={2}>
              <Stat size="sm">
                <StatLabel color={textSecondary} fontSize="xs">Nodes</StatLabel>
                <StatNumber fontSize="lg">{stats.total_nodes || 0}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel color={textSecondary} fontSize="xs">Links</StatLabel>
                <StatNumber fontSize="lg">{stats.total_links || 0}</StatNumber>
              </Stat>
            </HStack>
          </Box>
        )}

        <Divider borderColor={borderColor} />

        {/* Node Limit */}
        <FormControl>
          <HStack justify="space-between" mb={2}>
            <FormLabel fontSize="sm" color={textSecondary} mb={0}>
              Node Limit
            </FormLabel>
            <Badge colorScheme="blue">{nodeLimit}</Badge>
          </HStack>
          <Slider
            value={nodeLimit}
            min={50}
            max={500}
            step={50}
            onChange={onNodeLimitChange}
            colorScheme="blue"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </FormControl>

        {/* Link Strength Threshold */}
        <FormControl>
          <HStack justify="space-between" mb={2}>
            <FormLabel fontSize="sm" color={textSecondary} mb={0}>
              Link Strength
            </FormLabel>
            <Badge colorScheme="purple">{linkStrengthThreshold}</Badge>
          </HStack>
          <Slider
            value={linkStrengthThreshold}
            min={1}
            max={10}
            step={1}
            onChange={onLinkStrengthChange}
            colorScheme="purple"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </FormControl>

        <Divider borderColor={borderColor} />

        {/* Node Type Visibility */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>Node Types</Text>
          <VStack align="stretch" spacing={2}>
            {Object.entries(NODE_TYPES).map(([type, config]) => (
              <HStack key={type} justify="space-between">
                <HStack>
                  <Box w={3} h={3} borderRadius="full" bg={config.color} />
                  <Text fontSize="sm" color={textSecondary}>{config.label}</Text>
                  {stats?.node_types && (
                    <Badge size="sm" variant="subtle">
                      {stats.node_types[type] || 0}
                    </Badge>
                  )}
                </HStack>
                <Switch
                  isChecked={visibleTypes[type]}
                  onChange={() => onToggleType?.(type)}
                  colorScheme="blue"
                  size="sm"
                />
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
