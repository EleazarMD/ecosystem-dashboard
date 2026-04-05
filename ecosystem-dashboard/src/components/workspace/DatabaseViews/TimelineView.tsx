/**
 * TimelineView - Gantt chart view for databases (Placeholder)
 * Will display pages with date ranges on a timeline
 */

import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Database, Block, DatabaseView } from '../../../types/workspace';

interface TimelineViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

export function TimelineView({ database, pages, view, onUpdate }: TimelineViewProps) {
  return (
    <Box p={12} textAlign="center" bg={useSemanticToken('surface.base')} borderRadius="lg">
      <Text fontSize="4xl" mb={2}>📈</Text>
      <Text fontWeight="bold" mb={2}>Timeline View</Text>
      <Text color={useSemanticToken('text.secondary')} mb={4}>
        Coming soon! Display pages as a Gantt chart timeline.
      </Text>
      <VStack spacing={2}>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Planned features:</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Gantt chart visualization</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Date range bars</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Drag to adjust dates</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Zoom levels (day, week, month, quarter, year)</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Dependencies between pages</Text>
      </VStack>
    </Box>
  );
}

export default TimelineView;
