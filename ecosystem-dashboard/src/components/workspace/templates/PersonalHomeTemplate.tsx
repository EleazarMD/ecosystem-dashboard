/**
 * Personal Home Template
 * Two-column layout with Daily and Life sections
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
} from '@chakra-ui/react';
import { ColumnLayout } from '../ColumnLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export function PersonalHomeTemplate() {
  const [columns, setColumns] = useState([
    {
      id: 'daily',
      title: 'Daily',
      icon: '📅',
      items: [
        { id: '1', text: 'Movie List', icon: '🎬', completed: false },
        { id: '2', text: 'Recipes', icon: '🍲', completed: false },
      ],
    },
    {
      id: 'life',
      title: 'Life',
      icon: '🌟',
      items: [
        { id: '3', text: 'Yearly Goals', icon: '🎯', completed: false },
        { id: '4', text: 'Travel Plans', icon: '✈️', completed: false },
      ],
    },
  ]);

  const handleItemMove = (itemId: string, fromColumn: string, toColumn: string) => {
    setColumns((prevColumns) => {
      const newColumns = [...prevColumns];
      const fromCol = newColumns.find((col) => col.id === fromColumn);
      const toCol = newColumns.find((col) => col.id === toColumn);

      if (fromCol && toCol) {
        const itemIndex = fromCol.items.findIndex((item) => item.id === itemId);
        if (itemIndex !== -1) {
          const [item] = fromCol.items.splice(itemIndex, 1);
          toCol.items.push(item);
        }
      }

      return newColumns;
    });
  };

  return (
    <Box>
      {/* Header */}
      <VStack align="start" spacing={2} mb={6}>
        <HStack spacing={2}>
          <Text fontSize="2xl">🏠</Text>
          <Heading size="lg" fontWeight="700">
            Personal Home
          </Heading>
        </HStack>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          Organize everything in your life in one place.
        </Text>
      </VStack>

      {/* Column Layout */}
      <ColumnLayout
        columns={columns}
        onItemMove={handleItemMove}
        onColumnResize={(columnIndex, width) => {
          console.log(`Column ${columnIndex} resized to ${width}%`);
        }}
      />

      {/* Placeholder for slash command */}
      <Box mt={6} p={4} cursor="text" _hover={{ bg: 'gray.50' }} borderRadius="md">
        <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
          Write, press space for AI, / for commands...
        </Text>
      </Box>
    </Box>
  );
}
