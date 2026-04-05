/**
 * Provider Performance Controls Panel
 * Right panel controls for Provider Performance page
 */

import React from 'react';
import {
  VStack,
  Box,
  Text,
  ButtonGroup,
  Button,
  Icon,
  
} from '@chakra-ui/react';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Props {
  timeRange: string;
  timeRangeOptions: string[];
  onTimeRangeChange: (range: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function ProviderPerformanceControlsPanel({
  timeRange,
  timeRangeOptions,
  onTimeRangeChange,
  onRefresh,
  onExport,
}: Props) {
  const mutedText = useSemanticToken('text.secondary');

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Time Range Selector */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Time Range
        </Text>
        <ButtonGroup size="sm" isAttached variant="outline" width="full">
          {timeRangeOptions.map((option) => (
            <Button
              key={option}
              flex={1}
              colorScheme={timeRange === option ? 'blue' : 'gray'}
              onClick={() => onTimeRangeChange(option)}
              fontWeight={timeRange === option ? '600' : '400'}
            >
              {option}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Refresh Data */}
      <Box>
        <Button
          size="sm"
          width="full"
          leftIcon={<Icon as={FiRefreshCw} />}
          colorScheme="blue"
          variant="outline"
          onClick={onRefresh}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Export Report */}
      <Box>
        <Button
          size="sm"
          width="full"
          leftIcon={<Icon as={FiDownload} />}
          colorScheme="green"
          variant="outline"
          onClick={onExport}
        >
          Export Report
        </Button>
      </Box>

      {/* Info */}
      <Box pt={2} borderTopWidth="1px">
        <Text fontSize="xs" color={mutedText}>
          Real-time performance metrics updated every 30 seconds
        </Text>
      </Box>
    </VStack>
  );
}
