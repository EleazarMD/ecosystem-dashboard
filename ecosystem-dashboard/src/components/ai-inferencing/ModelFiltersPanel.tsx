/**
 * Model Filters Panel
 * Right panel filters for Model Usage page
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack,
  Box,
  Text,
  Checkbox,
  CheckboxGroup,
  Stack,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Select,
  Switch,
  HStack,
  
} from '@chakra-ui/react';

interface Props {
  providers: string[];
  costRange: [number, number];
  sortOptions: string[];
  autoRefresh: boolean;
  onProviderToggle: (provider: string) => void;
  onCostRangeChange: (range: [number, number]) => void;
  onSortChange: (sort: string) => void;
  onAutoRefreshToggle: (value: boolean) => void;
}

export function ModelFiltersPanel({
  providers,
  costRange,
  sortOptions,
  autoRefresh,
  onProviderToggle,
  onCostRangeChange,
  onSortChange,
  onAutoRefreshToggle,
}: Props) {
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['All']);
  const [currentCostRange, setCurrentCostRange] = useState<[number, number]>(costRange);
  const [currentSort, setCurrentSort] = useState<string>('Cost');
  
  const mutedText = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const handleProviderChange = (values: string[]) => {
    setSelectedProviders(values);
    values.forEach(provider => onProviderToggle(provider));
  };

  const handleCostRangeChange = (values: number[]) => {
    const range: [number, number] = [values[0], values[1]];
    setCurrentCostRange(range);
    onCostRangeChange(range);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentSort(e.target.value);
    onSortChange(e.target.value);
  };

  return (
    <VStack spacing={6} align="stretch" p={4}>
      {/* Provider Filters */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={3}>
          🎯 Provider
        </Text>
        <CheckboxGroup value={selectedProviders} onChange={handleProviderChange}>
          <Stack spacing={2}>
            {providers.map((provider) => (
              <Checkbox key={provider} value={provider} size="sm">
                {provider}
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </Box>

      {/* Cost Range Slider */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          💵 Cost Range
        </Text>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="xs" color={mutedText}>
            ${currentCostRange[0].toFixed(2)}
          </Text>
          <Text fontSize="xs" color={mutedText}>
            ${currentCostRange[1].toFixed(2)}
          </Text>
        </HStack>
        <RangeSlider
          min={0}
          max={3}
          step={0.1}
          value={currentCostRange}
          onChange={handleCostRangeChange}
          colorScheme="purple"
        >
          <RangeSliderTrack>
            <RangeSliderFilledTrack />
          </RangeSliderTrack>
          <RangeSliderThumb index={0} boxSize={4} />
          <RangeSliderThumb index={1} boxSize={4} />
        </RangeSlider>
      </Box>

      {/* Sort By */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          📊 Sort By
        </Text>
        <Select
          size="sm"
          value={currentSort}
          onChange={handleSortChange}
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Box>

      {/* Auto-Refresh Toggle */}
      <Box pt={2} borderTopWidth="1px" borderColor={borderColor}>
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="600">
              🔄 Auto-Refresh
            </Text>
            <Text fontSize="xs" color={mutedText}>
              Update every 30s
            </Text>
          </VStack>
          <Switch
            colorScheme="green"
            isChecked={autoRefresh}
            onChange={(e) => onAutoRefreshToggle(e.target.checked)}
          />
        </HStack>
      </Box>
    </VStack>
  );
}
