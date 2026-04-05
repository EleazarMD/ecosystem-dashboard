/**
 * Knowledge Graph Controls Component
 * 
 * This component provides controls for the Knowledge Graph visualization,
 * including search, filtering, and view options.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Slider,
  Text,
  IconButton,
  Tooltip,
  HStack,
  VStack,
  Flex,
  Heading,
  Collapse
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '../../ui/GlassPanel';
import { 
  FiZoomIn, 
  FiZoomOut, 
  FiRefreshCw, 
  FiFilter, 
  FiSearch 
} from 'react-icons/fi';

interface GraphControlsProps {
  onDepthChange?: (depth: number) => void;
  onLimitChange?: (limit: number) => void;
  onFocusChange?: (focusEntity: string) => void;
  onRelationTypesChange?: (types: string[]) => void;
  onRefresh?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  availableRelationTypes?: string[];
  currentDepth?: number;
  currentLimit?: number;
  currentFocus?: string;
  currentRelationTypes?: string[];
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  onDepthChange,
  onLimitChange,
  onFocusChange,
  onRelationTypesChange,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onReset,
  availableRelationTypes = ['RELATED_TO', 'HAS_TAG', 'BELONGS_TO_DOMAIN', 'AUTHORED_BY'],
  currentDepth = 2,
  currentLimit = 100,
  currentFocus = '',
  currentRelationTypes = []
}) => {
  const bg = useSemanticToken('surface.elevated');
  const [showFilters, setShowFilters] = useState(false);
  const [depth, setDepth] = useState(currentDepth);
  const [limit, setLimit] = useState(currentLimit);
  const [focus, setFocus] = useState(currentFocus);
  const [relationTypes, setRelationTypes] = useState<string[]>(currentRelationTypes);
  
  const handleDepthChange = (value: number) => {
    setDepth(value);
  };
  
  const handleDepthChangeCommitted = (value: number) => {
    if (onDepthChange) {
      onDepthChange(value);
    }
  };
  
  const handleLimitChange = (value: number) => {
    setLimit(value);
  };
  
  const handleLimitChangeCommitted = (value: number) => {
    if (onLimitChange) {
      onLimitChange(value);
    }
  };
  
  const handleFocusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFocus(event.target.value);
  };
  
  const handleFocusSubmit = () => {
    if (onFocusChange) {
      onFocusChange(focus);
    }
  };
  
  const handleRelationTypesChange = (value: string[]) => {
    setRelationTypes(value);
    if (onRelationTypesChange) {
      onRelationTypesChange(value);
    }
  };
  
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleFocusSubmit();
    }
  };
  
  return (
    <GlassPanel
      p={4}
      borderRadius="md"
      width="100%" // Allow it to fill the grid cell
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="sm">Graph Controls</Heading>
        <HStack spacing={1}>
          <Tooltip label="Zoom In" hasArrow>
            <IconButton 
              aria-label="Zoom In" 
              icon={<FiZoomIn />} 
              size="sm" 
              variant="ghost" 
              onClick={onZoomIn}
            />
          </Tooltip>
          <Tooltip label="Zoom Out" hasArrow>
            <IconButton 
              aria-label="Zoom Out" 
              icon={<FiZoomOut />} 
              size="sm" 
              variant="ghost" 
              onClick={onZoomOut}
            />
          </Tooltip>
          <Tooltip label="Reset View" hasArrow>
            <IconButton 
              aria-label="Reset View" 
              icon={<FiRefreshCw />} 
              size="sm" 
              variant="ghost" 
              onClick={onReset}
            />
          </Tooltip>
          <Tooltip label="Toggle Filters" hasArrow>
            <IconButton 
              aria-label="Toggle Filters" 
              icon={<FiFilter />} 
              size="sm" 
              variant={showFilters ? "solid" : "ghost"} 
              colorScheme={showFilters ? "blue" : undefined}
              onClick={() => setShowFilters(!showFilters)}
            />
          </Tooltip>
        </HStack>
      </Flex>
      
      <Box mb={4}>
        <FormControl>
          <FormLabel fontSize="sm" mb={1}>Focus Entity (Document ID)</FormLabel>
          <Flex>
            <Input
              value={focus}
              onChange={handleFocusChange}
              onKeyPress={handleKeyPress}
              size="sm"
              mr={2}
              placeholder="Enter entity ID"
            />
            <IconButton
              aria-label="Search"
              icon={<FiSearch />}
              size="sm"
              onClick={handleFocusSubmit}
            />
          </Flex>
        </FormControl>
      </Box>
      
      <Collapse in={showFilters} animateOpacity>
        <VStack spacing={4} align="stretch">
          <Box>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Relationship Depth: {depth}</FormLabel>
              <Slider
                value={depth}
                min={1}
                max={5}
                step={1}
                onChange={handleDepthChange}
                onChangeEnd={handleDepthChangeCommitted}
              />
            </FormControl>
          </Box>
          
          <Box>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Node Limit: {limit}</FormLabel>
              <Slider
                value={limit}
                min={10}
                max={200}
                step={10}
                onChange={handleLimitChange}
                onChangeEnd={handleLimitChangeCommitted}
              />
              <Flex justify="space-between" mt={1}>
                <Text fontSize="xs">10</Text>
                <Text fontSize="xs">100</Text>
                <Text fontSize="xs">200</Text>
              </Flex>
            </FormControl>
          </Box>
          
          <Box>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Relationship Types</FormLabel>
              <Select
                value={relationTypes[0] || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Toggle selection
                  const newTypes = relationTypes.includes(value) 
                    ? relationTypes.filter(t => t !== value)
                    : [...relationTypes, value];
                  handleRelationTypesChange(newTypes);
                }}
                size="sm"
                placeholder="Select relationship types"
              >
                {availableRelationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} {relationTypes.includes(type) ? "✓" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Box>
        </VStack>
      </Collapse>
      
      <Box mt={4}>
        <Button
          leftIcon={<FiRefreshCw />}
          colorScheme="blue"
          size="sm"
          width="100%"
          onClick={onRefresh}
        >
          Refresh Graph
        </Button>
      </Box>
    </GlassPanel>
  );
};
