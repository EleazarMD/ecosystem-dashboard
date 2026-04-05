/**
 * CalendarView - Calendar view for databases (Placeholder)
 * Will display pages with date properties on a calendar
 */

import React from 'react';
import { Box, Text, VStack, Button } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Database, Block, DatabaseView } from '../../../types/workspace';

interface CalendarViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

export function CalendarView({ database, pages, view, onUpdate }: CalendarViewProps) {
  return (
    <Box p={12} textAlign="center" bg={useSemanticToken('surface.base')} borderRadius="lg">
      <Text fontSize="4xl" mb={2}>📅</Text>
      <Text fontWeight="bold" mb={2}>Calendar View</Text>
      <Text color={useSemanticToken('text.secondary')} mb={4}>
        Coming soon! Display pages with date properties on a calendar.
      </Text>
      <VStack spacing={2}>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Planned features:</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Month, week, and day views</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Drag & drop to change dates</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Date range support</Text>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>• Multiple date property support</Text>
      </VStack>
    </Box>
  );
}

export default CalendarView;
