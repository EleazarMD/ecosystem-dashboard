import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Button,
  Divider,
  Badge,
  Icon,
  FormControl,
  FormLabel,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  
} from '@chakra-ui/react';
import { FiBarChart2, FiDownload, FiTrendingUp } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ModelUsageControlsProps {
  models?: any[];
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  totalRequests?: number;
}

export default function ModelUsageControls({
  models = [],
  timeRange: externalTimeRange = '24h',
  onTimeRangeChange,
  totalRequests = 0,
}: ModelUsageControlsProps) {
  const [groupBy, setGroupBy] = useState('model');
  const [minRequests, setMinRequests] = useState([0, 1000]);

  const highlightBg = useSemanticToken('surface.highlight');
  const baseBg = useSemanticToken('surface.base');
  const iconColor = useSemanticToken('interactive.secondary');

  // Calculate top models with percentages
  const topModels = models
    .sort((a, b) => (b.requests || 0) - (a.requests || 0))
    .slice(0, 3);

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Header */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiBarChart2} color={iconColor} />
          <Text fontSize="md" fontWeight="bold">Usage Analysis</Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          Analyze model usage patterns
        </Text>
      </Box>

      <Divider />

      {/* Time Range */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          TIME PERIOD
        </Text>

        <FormControl>
          <FormLabel fontSize="sm">Select Range</FormLabel>
          <Select
            size="sm"
            value={externalTimeRange}
            onChange={(e) => onTimeRangeChange?.(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </Select>
        </FormControl>
      </Box>

      <Divider />

      {/* Group By */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          GROUPING
        </Text>

        <FormControl>
          <FormLabel fontSize="sm">Group By</FormLabel>
          <Select
            size="sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="model">Model</option>
            <option value="provider">Provider</option>
            <option value="project">Project</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </Select>
        </FormControl>
      </Box>

      <Divider />

      {/* Filters */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          FILTERS
        </Text>

        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">Minimum Requests: {minRequests[0]}</FormLabel>
            <RangeSlider
              defaultValue={minRequests}
              min={0}
              max={1000}
              step={10}
              onChange={setMinRequests}
            >
              <RangeSliderTrack>
                <RangeSliderFilledTrack bg={useSemanticToken('interactive.secondary')} />
              </RangeSliderTrack>
              <RangeSliderThumb index={0} />
              <RangeSliderThumb index={1} />
            </RangeSlider>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Model Type</FormLabel>
            <Select size="sm">
              <option value="all">All Models</option>
              <option value="chat">Chat Models</option>
              <option value="embedding">Embedding Models</option>
              <option value="image">Image Models</option>
            </Select>
          </FormControl>
        </VStack>
      </Box>

      <Divider />

      {/* Top Models */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          TOP MODELS ({models.length})
        </Text>

        <VStack spacing={2} align="stretch">
          {topModels.length > 0 ? (
            topModels.map((model: any, index: number) => {
              const percentage = totalRequests > 0
                ? ((model.requests / totalRequests) * 100).toFixed(1)
                : '0';
              const colorScheme = index === 0 ? 'purple' : index === 1 ? 'green' : 'gray';

              return (
                <HStack
                  key={model.model || model.name}
                  justify="space-between"
                  p={2}
                  bg={index < 2 ? highlightBg : baseBg}
                  borderRadius="md"
                >
                  <Text fontSize="sm" fontWeight={index < 2 ? 'semibold' : 'normal'}>
                    {model.model || model.name}
                  </Text>
                  <Badge colorScheme={colorScheme}>
                    {percentage}%
                  </Badge>
                </HStack>
              );
            })
          ) : (
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
              No model usage data available
            </Text>
          )}
        </VStack>
      </Box >

      <Divider />

      {/* Actions */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          ACTIONS
        </Text>

        <VStack spacing={2}>
          <Button
            size="sm"
            width="full"
            leftIcon={<FiTrendingUp />}
            variant="outline"
            colorScheme="purple"
          >
            View Trends
          </Button>
          <Button
            size="sm"
            width="full"
            leftIcon={<FiDownload />}
            variant="outline"
          >
            Export Usage Data
          </Button>
        </VStack>
      </Box>
    </VStack >
  );
}
