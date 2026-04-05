/**
 * Travel Planner Template
 * Pre-configured template with packing lists and columns
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Checkbox,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ColumnLayout } from '../ColumnLayout';
import { NotionTable } from '../NotionTable';

interface TravelPlannerData {
  destination: string;
  packingList: {
    clothes: { id: string; item: string; packed: boolean }[];
    toiletries: { id: string; item: string; packed: boolean }[];
    electronics: { id: string; item: string; packed: boolean }[];
  };
  itinerary: any[];
}

export function TravelPlannerTemplate() {
  const [data, setData] = useState<TravelPlannerData>({
    destination: 'Paris',
    packingList: {
      clothes: [
        { id: '1', item: 'Socks', packed: false },
        { id: '2', item: 'T-shirts', packed: false },
        { id: '3', item: 'Jeans', packed: false },
        { id: '4', item: 'Shoes', packed: false },
      ],
      toiletries: [
        { id: '1', item: 'Toothbrush', packed: false },
        { id: '2', item: 'Toothpaste', packed: false },
        { id: '3', item: 'Sunscreen', packed: false },
      ],
      electronics: [
        { id: '1', item: 'Charger', packed: false },
        { id: '2', item: 'Laptop', packed: false },
        { id: '3', item: 'Headphones for kids', packed: false },
      ],
    },
    itinerary: [],
  });

  const borderColor = useSemanticToken('border.default');

  const renderPackingSection = (
    title: string,
    icon: string,
    items: { id: string; item: string; packed: boolean }[]
  ) => {
    return (
      <Box>
        <HStack mb={3} spacing={2}>
          <Text fontSize="md" fontWeight="600" color={useSemanticToken('text.primary')}>
            {title}
          </Text>
          <Text fontSize="md">{icon}</Text>
        </HStack>
        <VStack align="stretch" spacing={2}>
          {items.map((item) => (
            <HStack key={item.id}>
              <Checkbox
                isChecked={item.packed}
                onChange={(e) => {
                  // Update state
                  console.log('Toggle:', item.item, e.target.checked);
                }}
              />
              <Text
                fontSize="sm"
                color={useSemanticToken('text.primary')}
                textDecoration={item.packed ? 'line-through' : 'none'}
                opacity={item.packed ? 0.6 : 1}
              >
                {item.item}
              </Text>
            </HStack>
          ))}
          <Text fontSize="xs" color={useSemanticToken('text.tertiary')} fontStyle="italic">
            Kid's packing list for kids is
          </Text>
          {items.length > 3 && (
            <HStack>
              <Checkbox />
              <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                Kids toothbrushes
              </Text>
            </HStack>
          )}
          {items.length > 3 && (
            <HStack>
              <Checkbox />
              <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                Kids shampoo
              </Text>
            </HStack>
          )}
          {items.length > 3 && (
            <HStack>
              <Checkbox />
              <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                Kids lotion
              </Text>
            </HStack>
          )}
        </VStack>
      </Box>
    );
  };

  return (
    <Box>
      {/* Template Title */}
      <VStack align="start" spacing={2} mb={6}>
        <HStack spacing={2}>
          <Text fontSize="2xl">✈️</Text>
          <Heading size="lg" fontWeight="700">
            Travel Planner
          </Heading>
        </HStack>
        <Box
          p={3}
          bg="blue.50"
          borderRadius="md"
          borderLeft="3px solid"
          borderColor="blue.400"
        >
          <HStack spacing={2}>
            <Text fontSize="sm">💡</Text>
            <Text fontSize="sm" color={useSemanticToken('text.primary')}>
              <strong>Notion Tip:</strong> Make travel planning fun with this setup — an all-in-one packing list, trip planner, and shareable itinerary.
            </Text>
          </HStack>
        </Box>
      </VStack>

      {/* Packing List */}
      <Box mb={8}>
        <Heading size="md" fontWeight="600" mb={4}>
          Packing list
        </Heading>
        <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={4}>
          Never forget your charger again. Add your packing list and check off the items as you go.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          {renderPackingSection('Clothes', '👕', data.packingList.clothes)}
          {renderPackingSection('Toiletries', '🧴', data.packingList.toiletries)}
          {renderPackingSection('Electronics', '📱', data.packingList.electronics)}
        </SimpleGrid>
      </Box>

      {/* Itinerary Section */}
      <Box mb={8}>
        <Heading size="md" fontWeight="600" mb={4}>
          Itinerary
        </Heading>
        <NotionTable
          columns={[
            { id: 'date', name: 'Date', type: 'date', width: 150 },
            { id: 'activity', name: 'Activity', type: 'text', width: 250 },
            { id: 'location', name: 'Location', type: 'text', width: 200 },
            { id: 'notes', name: 'Notes', type: 'text', width: 300 },
            { id: 'status', name: 'Status', type: 'select', width: 120, options: ['Planned', 'Booked', 'Completed'] },
          ]}
          rows={[
            {
              id: '1',
              date: '2025-11-01',
              activity: 'Eiffel Tower Visit',
              location: 'Paris, France',
              notes: 'Book tickets online',
              status: 'Planned',
            },
          ]}
          onCellEdit={(rowId, columnId, value) => {
            console.log('Cell edit:', rowId, columnId, value);
          }}
          onRowAdd={() => {
            console.log('Add row');
          }}
        />
      </Box>

      {/* Notes Section */}
      <Box>
        <Heading size="md" fontWeight="600" mb={4}>
          Notes
        </Heading>
        <Box
          p={4}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="md"
          minH="150px"
          cursor="text"
        >
          <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
            Add any additional notes, confirmations, or reminders here...
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
