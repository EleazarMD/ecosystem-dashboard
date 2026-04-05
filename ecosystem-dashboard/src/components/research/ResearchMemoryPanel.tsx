/**
 * Research Memory Panel — displays saved research findings from the knowledge base.
 * Shows memory entries, search, stats, and clear functionality.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Input,
  IconButton,
  Divider,
  Button,
  Tooltip,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { FiSearch, FiTrash2, FiDatabase, FiClock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  getResearchMemory,
  searchResearchMemory,
  deleteResearchMemory,
  clearResearchMemory,
  getMemoryStats,
  type ResearchMemoryEntry,
} from '@/lib/research/research-memory';

export default function ResearchMemoryPanel() {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const surfaceBase = useSemanticToken('surface.base');

  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<ResearchMemoryEntry[]>(() => getResearchMemory());
  const stats = getMemoryStats();

  const refresh = useCallback(() => setEntries(getResearchMemory()), []);

  const displayEntries = searchQuery.length > 2
    ? searchResearchMemory(searchQuery, 20)
    : entries;

  return (
    <VStack spacing={3} align="stretch" p={3} h="full" overflowY="auto">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiDatabase />
          <Text fontSize="sm" fontWeight="700" color={textColor}>
            Research Memory
          </Text>
          <Badge colorScheme="purple" fontSize="2xs">{stats.totalEntries}</Badge>
        </HStack>
        {entries.length > 0 && (
          <Tooltip label="Clear all memory">
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => {
                if (confirm('Clear all research memory? This cannot be undone.')) {
                  clearResearchMemory();
                  refresh();
                }
              }}
            >
              Clear All
            </Button>
          </Tooltip>
        )}
      </HStack>

      {/* Stats */}
      {stats.totalEntries > 0 && (
        <HStack
          spacing={3}
          p={2}
          bg={surfaceBase}
          borderRadius="md"
          fontSize="2xs"
          color={mutedColor}
        >
          <Text><strong>{stats.totalWords.toLocaleString()}</strong> words</Text>
          <Text><strong>{stats.totalEntries}</strong> entries</Text>
          {stats.oldestDate && <Text>Since {stats.oldestDate}</Text>}
        </HStack>
      )}

      {/* Search */}
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <FiSearch color={mutedColor} />
        </InputLeftElement>
        <Input
          placeholder="Search memory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          bg={surfaceBase}
          borderColor={borderColor}
          fontSize="xs"
        />
      </InputGroup>

      <Divider />

      {/* Entries */}
      {displayEntries.length === 0 ? (
        <VStack spacing={2} py={6}>
          <FiDatabase size={24} color={mutedColor} />
          <Text fontSize="xs" color={mutedColor} textAlign="center">
            {searchQuery ? 'No matching memories found' : 'No research saved yet. Completed research is automatically saved here.'}
          </Text>
        </VStack>
      ) : (
        <VStack spacing={2} align="stretch">
          {displayEntries.slice(0, 30).map((entry) => (
            <Box
              key={entry.id}
              p={2.5}
              bg={surfaceBase}
              borderRadius="md"
              borderLeft="3px solid"
              borderColor="purple.500"
              position="relative"
              _hover={{ '& .delete-btn': { opacity: 1 } }}
            >
              <VStack align="stretch" spacing={1}>
                <HStack justify="space-between">
                  <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={2}>
                    {entry.query}
                  </Text>
                  <IconButton
                    className="delete-btn"
                    aria-label="Delete"
                    icon={<FiTrash2 size={12} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    opacity={0}
                    transition="opacity 0.15s"
                    onClick={() => {
                      deleteResearchMemory(entry.id);
                      refresh();
                    }}
                  />
                </HStack>
                <Text fontSize="2xs" color={mutedColor} noOfLines={3}>
                  {entry.summary}
                </Text>
                <HStack spacing={2} fontSize="2xs" color={mutedColor}>
                  <Badge colorScheme="gray" fontSize="2xs">{entry.model}</Badge>
                  <HStack spacing={1}>
                    <FiClock size={10} />
                    <Text>{new Date(entry.createdAt).toLocaleDateString()}</Text>
                  </HStack>
                  <Text>{entry.wordCount} words</Text>
                  {entry.sourceCount > 0 && <Text>{entry.sourceCount} sources</Text>}
                </HStack>
                {entry.keywords.length > 0 && (
                  <HStack spacing={1} flexWrap="wrap">
                    {entry.keywords.slice(0, 5).map((kw) => (
                      <Badge key={kw} colorScheme="purple" variant="subtle" fontSize="2xs">
                        {kw}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
