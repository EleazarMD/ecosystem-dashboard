/**
 * Graph Filters Panel
 * Right panel component for filtering email knowledge graph
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Checkbox,
  CheckboxGroup,
  Divider,
  Button,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

export default function GraphFiltersPanel() {
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const { customData } = useRightPanel();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiments, setSelectedSentiments] = useState<string[]>(['positive', 'neutral', 'negative']);
  const [dateRange, setDateRange] = useState('all');
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);

  const { sentiments } = customData || {};

  const handleAddHighlight = () => {
    if (searchQuery && !highlightedNodes.includes(searchQuery)) {
      setHighlightedNodes([...highlightedNodes, searchQuery]);
      setSearchQuery('');
    }
  };

  const handleRemoveHighlight = (node: string) => {
    setHighlightedNodes(highlightedNodes.filter(n => n !== node));
  };

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Search/Highlight */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={2}>Search & Highlight</Text>
          <HStack>
            <InputGroup size="sm">
              <InputLeftElement>
                <MagnifyingGlassIcon className="w-4 h-4" />
              </InputLeftElement>
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddHighlight()}
              />
            </InputGroup>
            <Button size="sm" colorScheme="blue" onClick={handleAddHighlight}>
              Add
            </Button>
          </HStack>
          
          {highlightedNodes.length > 0 && (
            <Wrap mt={2}>
              {highlightedNodes.map(node => (
                <WrapItem key={node}>
                  <Tag size="sm" colorScheme="blue" borderRadius="full">
                    <TagLabel>{node}</TagLabel>
                    <TagCloseButton onClick={() => handleRemoveHighlight(node)} />
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          )}
        </Box>

        <Divider borderColor={borderColor} />

        {/* Date Range */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={2}>Time Range</Text>
          <Select size="sm" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </Select>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Sentiment Filter */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={2}>Sentiment Filter</Text>
          <CheckboxGroup value={selectedSentiments} onChange={(values) => setSelectedSentiments(values as string[])}>
            <VStack align="start" spacing={2}>
              <Checkbox value="positive" colorScheme="green" size="sm">
                <HStack>
                  <Text fontSize="sm">Positive</Text>
                  {sentiments?.distribution?.positive && (
                    <Text fontSize="xs" color={textSecondary}>
                      ({sentiments.distribution.positive})
                    </Text>
                  )}
                </HStack>
              </Checkbox>
              <Checkbox value="neutral" colorScheme="gray" size="sm">
                <HStack>
                  <Text fontSize="sm">Neutral</Text>
                  {sentiments?.distribution?.neutral && (
                    <Text fontSize="xs" color={textSecondary}>
                      ({sentiments.distribution.neutral})
                    </Text>
                  )}
                </HStack>
              </Checkbox>
              <Checkbox value="negative" colorScheme="red" size="sm">
                <HStack>
                  <Text fontSize="sm">Negative</Text>
                  {sentiments?.distribution?.negative && (
                    <Text fontSize="xs" color={textSecondary}>
                      ({sentiments.distribution.negative})
                    </Text>
                  )}
                </HStack>
              </Checkbox>
            </VStack>
          </CheckboxGroup>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Actions */}
        <VStack align="stretch" spacing={2}>
          <Button size="sm" variant="outline" colorScheme="blue">
            Apply Filters
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            setSearchQuery('');
            setHighlightedNodes([]);
            setSelectedSentiments(['positive', 'neutral', 'negative']);
            setDateRange('all');
          }}>
            Reset All
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
