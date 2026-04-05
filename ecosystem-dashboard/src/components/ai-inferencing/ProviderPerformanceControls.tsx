import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Select,
  Button,
  Divider,
  Badge,
  Icon,
  FormControl,
  FormLabel,
  
} from '@chakra-ui/react';
import { FiFilter, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProviderPerformanceControlsProps {
  providers?: any[];
  onRefresh?: () => void;
  onExport?: () => void;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
}

export default function ProviderPerformanceControls({
  providers = [],
  onRefresh,
  onExport,
  autoRefreshEnabled = true,
  onAutoRefreshChange,
}: ProviderPerformanceControlsProps) {
  const [sortBy, setSortBy] = useState('latency');
  const [showInactive, setShowInactive] = useState(false);
  
  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'anthropic': 'purple',
      'openai': 'green',
      'google': 'blue',
      'cohere': 'orange',
    };
    return colors[provider.toLowerCase()] || 'gray';
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Header */}
      <Box>
        <HStack spacing={2} mb={2}>
          <Icon as={FiFilter} color={useSemanticToken('interactive.primary')} />
          <Text fontSize="md" fontWeight="bold">Performance Controls</Text>
        </HStack>
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          Configure provider metrics display
        </Text>
      </Box>

      <Divider />

      {/* Sort & Filter */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          DISPLAY OPTIONS
        </Text>
        
        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="sm">Sort By</FormLabel>
            <Select 
              size="sm" 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="latency">Latency (Low to High)</option>
              <option value="success-rate">Success Rate (High to Low)</option>
              <option value="requests">Total Requests</option>
              <option value="cost">Cost (Low to High)</option>
            </Select>
          </FormControl>

          <HStack justify="space-between">
            <Text fontSize="sm">Show Inactive</Text>
            <Switch 
              size="sm" 
              isChecked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm">Auto Refresh</Text>
            <Switch 
              size="sm" 
              colorScheme="blue"
              isChecked={autoRefreshEnabled}
              onChange={(e) => onAutoRefreshChange?.(e.target.checked)}
            />
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Provider Selection */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={3} color={useSemanticToken('text.secondary')}>
          COMPARE PROVIDERS ({providers.length})
        </Text>
        
        <VStack spacing={2} align="stretch">
          {providers.length > 0 ? (
            providers.map((provider: any) => {
              const colorScheme = getProviderColor(provider.provider || provider.name);
              const isHealthy = provider.successRate >= 95;
              
              return (
                <HStack 
                  key={provider.provider || provider.name}
                  justify="space-between" 
                  p={2} 
                  bg={useSemanticToken('surface.hover')} 
                  borderRadius="md"
                >
                  <HStack>
                    <Box w={2} h={2} bg={useSemanticToken('status.success')} borderRadius="full" />
                    <Text fontSize="sm" fontWeight="medium">
                      {provider.provider || provider.name}
                    </Text>
                  </HStack>
                  <Badge colorScheme={isHealthy ? 'green' : 'orange'}>
                    {provider.successRate?.toFixed(1)}%
                  </Badge>
                </HStack>
              );
            })
          ) : (
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
              No provider data available
            </Text>
          )}
        </VStack>
      </Box>

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
            leftIcon={<FiRefreshCw />}
            variant="outline"
            onClick={onRefresh}
            isDisabled={!onRefresh}
          >
            Refresh Metrics
          </Button>
          <Button 
            size="sm" 
            width="full" 
            leftIcon={<FiDownload />}
            variant="outline"
            onClick={onExport}
            isDisabled={!onExport}
          >
            Export Report
          </Button>
        </VStack>
      </Box>

      {/* Info */}
      <Box p={3} bg={useSemanticToken('interactive.surface')} borderRadius="md">
        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
          <strong>Tip:</strong> Click on a provider card to view detailed performance metrics and historical trends.
        </Text>
      </Box>
    </VStack>
  );
}
