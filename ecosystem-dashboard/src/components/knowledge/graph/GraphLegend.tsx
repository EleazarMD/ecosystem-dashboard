/**
 * Knowledge Graph Legend Component
 * 
 * This component displays a legend for the Knowledge Graph visualization,
 * showing the different node types and their corresponding colors.
 */

import React from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { GlassPanel } from '../../ui/GlassPanel';

interface GraphLegendProps {
  nodeColors: Record<string, string>;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ nodeColors }) => {
  const bgColor = useSemanticToken('surface.elevated');
  
  return (
    <GlassPanel
      p={3}
      borderRadius="md"
      opacity={0.9}
      minWidth="120px"
    >
      <Text fontWeight="semibold" fontSize="sm" mb={2}>Legend</Text>
      {Object.entries(nodeColors)
        .filter(([key]) => key !== 'default')
        .map(([type, color]) => (
          <Flex key={type} alignItems="center" mb={1}>
            <Box 
              width="12px" 
              height="12px" 
              borderRadius="full" 
              bg={color} 
              mr={2}
              borderWidth="1px"
              borderColor={bgColor}
            />
            <Text fontSize="xs">{type}</Text>
          </Flex>
        ))}
    </GlassPanel>
  );
};
