/**
 * AI Inferencing Right Panel - Contextual controls and details
 * Changes based on active page
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Divider,
  Icon,
  Badge,
  Switch,
  Select,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Checkbox,
  CheckboxGroup,
  Stack,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiClock,
  FiDollarSign,
  FiActivity,
  FiSettings,
} from 'react-icons/fi';

interface Props {
  page: string;
  onTimeRangeChange?: (range: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  timeRange?: string;
}

export function AIInferencingRightPanel({
  page,
  onTimeRangeChange,
  onRefresh,
  onExport,
  timeRange = '7d',
}: Props) {
  const mutedText = useSemanticToken('text.secondary');

  const renderProviderPerformanceControls = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Time Range
        </Text>
        <ButtonGroup size="sm" isAttached variant="outline" width="full">
          <Button
            flex={1}
            colorScheme={timeRange === '24h' ? 'blue' : 'gray'}
            onClick={() => onTimeRangeChange?.('24h')}
          >
            24h
          </Button>
          <Button
            flex={1}
            colorScheme={timeRange === '7d' ? 'blue' : 'gray'}
            onClick={() => onTimeRangeChange?.('7d')}
          >
            7d
          </Button>
          <Button
            flex={1}
            colorScheme={timeRange === '30d' ? 'blue' : 'gray'}
            onClick={() => onTimeRangeChange?.('30d')}
          >
            30d
          </Button>
        </ButtonGroup>
      </Box>

      <Divider />

      <Box>
        <Button
          leftIcon={<FiRefreshCw />}
          size="sm"
          variant="outline"
          width="full"
          onClick={onRefresh}
        >
          Refresh Data
        </Button>
      </Box>

      <Box>
        <Button
          leftIcon={<FiDownload />}
          size="sm"
          variant="outline"
          width="full"
          onClick={onExport}
        >
          Export Report
        </Button>
      </Box>
    </VStack>
  );

  const renderModelUsageFilters = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={3}>
          <Icon as={FiFilter} mr={2} />
          Filters
        </Text>

        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Provider
            </Text>
            <CheckboxGroup defaultValue={['all']}>
              <Stack spacing={2}>
                <Checkbox value="all" size="sm">All Providers</Checkbox>
                <Checkbox value="openai" size="sm">OpenAI</Checkbox>
                <Checkbox value="google" size="sm">Google</Checkbox>
                <Checkbox value="anthropic" size="sm">Anthropic</Checkbox>
              </Stack>
            </CheckboxGroup>
          </Box>

          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Cost Range
            </Text>
            <RangeSlider
              defaultValue={[0, 3]}
              min={0}
              max={3}
              step={0.1}
              size="sm"
            >
              <RangeSliderTrack>
                <RangeSliderFilledTrack />
              </RangeSliderTrack>
              <RangeSliderThumb index={0} />
              <RangeSliderThumb index={1} />
            </RangeSlider>
            <HStack justify="space-between" fontSize="xs" color={mutedText} mt={1}>
              <Text>$0</Text>
              <Text>$3.00</Text>
            </HStack>
          </Box>

          <Divider />

          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Sort By
            </Text>
            <Select size="sm" defaultValue="cost">
              <option value="cost">Cost (High to Low)</option>
              <option value="requests">Requests (High to Low)</option>
              <option value="latency">Latency (High to Low)</option>
              <option value="successRate">Success Rate (Low to High)</option>
            </Select>
          </Box>

          <Divider />

          <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="600">Auto-Refresh</Text>
            <Switch size="sm" defaultChecked />
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );

  const renderActivityLogsFilters = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={3}>
          Filters
        </Text>

        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Status
            </Text>
            <Select size="sm" defaultValue="all">
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="error">Errors Only</option>
              <option value="pending">Pending</option>
            </Select>
          </Box>

          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Provider
            </Text>
            <Select size="sm" defaultValue="all">
              <option value="all">All Providers</option>
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
              <option value="anthropic">Anthropic</option>
            </Select>
          </Box>

          <Box>
            <Text fontSize="xs" color={mutedText} mb={2}>
              Service
            </Text>
            <Select size="sm" defaultValue="all">
              <option value="all">All Services</option>
              <option value="research-lab">Research Lab</option>
              <option value="podcast-studio">Podcast Studio</option>
            </Select>
          </Box>

          <Divider />

          <Button
            leftIcon={<FiDownload />}
            size="sm"
            variant="outline"
            width="full"
          >
            Export CSV
          </Button>
        </VStack>
      </Box>
    </VStack>
  );

  const renderCostOptimizationPanel = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          <Icon as={FiDollarSign} mr={2} />
          Potential Savings
        </Text>
        <VStack align="stretch" spacing={2}>
          <Box p={3} bg={useSemanticToken('surface.highlight')} borderRadius="md">
            <Text fontSize="2xl" fontWeight="700" color="green.500">
              $3.33/day
            </Text>
            <Text fontSize="xs" color={mutedText}>
              $99.90/month
            </Text>
          </Box>
        </VStack>
      </Box>

      <Divider />

      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Top Opportunities
        </Text>
        <VStack align="stretch" spacing={2} fontSize="xs">
          <HStack justify="space-between">
            <Text>Replace o1-pro</Text>
            <Badge colorScheme="green">$2.65</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text>Use gpt-4o-mini</Text>
            <Badge colorScheme="green">$0.58</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text>Enable caching</Text>
            <Badge colorScheme="yellow">$0.59</Badge>
          </HStack>
        </VStack>
      </Box>

      <Divider />

      <Button
        colorScheme="green"
        size="sm"
        width="full"
      >
        Apply All Recommendations
      </Button>
    </VStack>
  );

  const renderDefaultControls = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Button
          leftIcon={<FiRefreshCw />}
          size="sm"
          variant="outline"
          width="full"
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>
      <Box>
        <Button
          leftIcon={<FiSettings />}
          size="sm"
          variant="outline"
          width="full"
        >
          Settings
        </Button>
      </Box>
    </VStack>
  );

  const renderGooseAnalyticsControls = () => (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Goose AI Performance
        </Text>
        <Text fontSize="xs" color={mutedText} mb={3}>
          Real-time metrics for Goose AI optimization features
        </Text>
      </Box>

      <Divider />

      <Box>
        <Button
          leftIcon={<FiRefreshCw />}
          size="sm"
          variant="outline"
          width="full"
          onClick={onRefresh}
        >
          Refresh Metrics
        </Button>
      </Box>

      <Box>
        <Text fontSize="xs" fontWeight="600" mb={2} color={mutedText}>
          Quick Stats
        </Text>
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <Text fontSize="xs">Cache Hit Rate</Text>
            <Badge colorScheme="blue">Live</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs">Model Switching</Text>
            <Badge colorScheme="purple">Active</Badge>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs">Cost Savings</Text>
            <Badge colorScheme="green">Tracked</Badge>
          </HStack>
        </VStack>
      </Box>

      <Divider />

      <Box>
        <Button
          leftIcon={<FiSettings />}
          size="sm"
          variant="outline"
          width="full"
        >
          Performance Settings
        </Button>
      </Box>
    </VStack>
  );

  const renderPanelContent = () => {
    switch (page) {
      case 'provider-performance':
        return renderProviderPerformanceControls();
      case 'model-usage':
        return renderModelUsageFilters();
      case 'activity-logs':
        return renderActivityLogsFilters();
      case 'cost-optimization':
        return renderCostOptimizationPanel();
      case 'goose-analytics':
        return renderGooseAnalyticsControls();
      default:
        return renderDefaultControls();
    }
  };

  return (
    <VStack spacing={4} align="stretch" width="full" p={4}>
      {renderPanelContent()}
    </VStack>
  );
}
