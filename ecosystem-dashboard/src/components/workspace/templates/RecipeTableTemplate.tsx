/**
 * Recipe Table Template
 * Database view for recipes with tags and links
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
} from '@chakra-ui/react';
import { NotionTable, TableColumn, TableRow } from '../NotionTable';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export function RecipeTableTemplate() {
  const [rows, setRows] = useState<TableRow[]>([
    {
      id: '1',
      recipe: 'Chicken soup',
      tags: 'Dinner',
      link: 'https://example.com/chicken-soup',
      rating: '5',
      prepTime: '30 min',
    },
  ]);

  const columns: TableColumn[] = [
    { id: 'recipe', name: 'Recipe', type: 'text', width: 250 },
    {
      id: 'tags',
      name: 'Tags',
      type: 'select',
      width: 150,
      options: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'],
    },
    { id: 'link', name: 'Link', type: 'url', width: 200 },
    { id: 'rating', name: 'Rating', type: 'number', width: 100 },
    { id: 'prepTime', name: 'Prep Time', type: 'text', width: 120 },
  ];

  const handleCellEdit = (rowId: string, columnId: string, value: any) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      )
    );
  };

  const handleRowAdd = () => {
    const newRow: TableRow = {
      id: `${Date.now()}`,
      recipe: '',
      tags: '',
      link: '',
      rating: '',
      prepTime: '',
    };
    setRows([...rows, newRow]);
  };

  const handleRowDelete = (rowId: string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== rowId));
  };

  return (
    <Box>
      {/* Header */}
      <VStack align="start" spacing={2} mb={6}>
        <HStack spacing={2}>
          <Text fontSize="2xl">🍲</Text>
          <Heading size="lg" fontWeight="700">
            Recipes
          </Heading>
        </HStack>
      </VStack>

      {/* View Tabs */}
      <HStack spacing={4} mb={4} borderBottom="1px solid" borderColor={useSemanticToken('border.default')} pb={2}>
        <HStack spacing={2} cursor="pointer" pb={1} borderBottom="2px solid" borderColor="blue.500">
          <Text fontSize="sm" fontWeight="600" color="blue.600">
            📋 All Recipes
          </Text>
        </HStack>
        <HStack spacing={2} cursor="pointer" pb={1}>
          <Text fontSize="sm" fontWeight="500" color={useSemanticToken('text.secondary')}>
            📊 Recent
          </Text>
        </HStack>
        <HStack spacing={2} cursor="pointer" pb={1}>
          <Text fontSize="sm" fontWeight="500" color={useSemanticToken('text.secondary')}>
            🏷️ My Tags
          </Text>
        </HStack>
      </HStack>

      {/* Table */}
      <NotionTable
        columns={columns}
        rows={rows}
        onCellEdit={handleCellEdit}
        onRowAdd={handleRowAdd}
        onRowDelete={handleRowDelete}
        onColumnAdd={() => console.log('Add column')}
      />

      {/* Footer Stats */}
      <HStack mt={4} spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
        <Text>Count: {rows.length}</Text>
      </HStack>
    </Box>
  );
}
