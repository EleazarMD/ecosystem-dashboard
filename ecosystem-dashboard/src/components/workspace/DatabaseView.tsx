/**
 * DatabaseView - Notion-style database table view
 * Renders database blocks as tables where each row is a page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Spinner,
  VStack,
  HStack,
  Badge,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiDatabase, FiTable, FiLock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DatabasePage {
  id: string;
  title: string;
  schema: string;
  table: string;
  columnCount: number;
  rowCount: number;
  isLocked: boolean;
  lastSynced: string;
}

interface DatabaseViewProps {
  databaseId: string;
  onPageClick: (pageId: string) => void;
}

export function DatabaseView({ databaseId, onPageClick }: DatabaseViewProps) {
  const [pages, setPages] = useState<DatabasePage[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const theadBg = useSemanticToken('surface.base');

  useEffect(() => {
    loadDatabasePages();
  }, [databaseId]);

  const loadDatabasePages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks/${databaseId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform children into database pages
        const databasePages: DatabasePage[] = data.children?.map((child: any) => {
          // Extract table info from title (format: "schema.table_name")
          const fullName = child.properties?.title?.[0]?.text?.content || 'Untitled';
          const [schema, table] = fullName.split('.');
          
          return {
            id: child.id,
            title: fullName,
            schema: schema || 'unknown',
            table: table || fullName,
            columnCount: 0, // Will be loaded from table_catalog_entries
            rowCount: 0,
            isLocked: child.is_locked || false,
            lastSynced: child.updated_at || child.last_edited_time,
          };
        }) || [];

        // Load additional metadata from table_catalog_entries
        await enrichWithMetadata(databasePages);
        
        setPages(databasePages);
      }
    } catch (error) {
      console.error('Failed to load database pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichWithMetadata = async (databasePages: DatabasePage[]) => {
    // Fetch metadata for all pages in one request
    try {
      const response = await fetch('/api/workspace/catalog/entries');
      if (response.ok) {
        const { entries } = await response.json();
        
        // Create a map for quick lookup
        const metadataMap = new Map(
          entries.map((entry: any) => [
            entry.entry_id,
            {
              columnCount: entry.column_count,
              rowCount: entry.estimated_row_count,
            }
          ])
        );
        
        // Enrich pages with metadata
        databasePages.forEach(page => {
          const metadata = metadataMap.get(page.id);
          if (metadata) {
            page.columnCount = metadata.columnCount || 0;
            page.rowCount = metadata.rowCount || 0;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  if (loading) {
    return (
      <VStack py={12} spacing={4}>
        <Spinner size="xl" />
        <Text color={mutedColor}>Loading database...</Text>
      </VStack>
    );
  }

  if (pages.length === 0) {
    return (
      <VStack py={12} spacing={4}>
        <Icon as={FiDatabase} boxSize={12} color={mutedColor} />
        <Text color={mutedColor}>No entries in this database</Text>
      </VStack>
    );
  }

  // Group by schema
  const pagesBySchema = pages.reduce((acc, page) => {
    if (!acc[page.schema]) {
      acc[page.schema] = [];
    }
    acc[page.schema].push(page);
    return acc;
  }, {} as Record<string, DatabasePage[]>);

  return (
    <Box px={8} py={6}>
      <VStack spacing={8} align="stretch">
        {Object.entries(pagesBySchema).map(([schema, schemaPages]) => (
          <Box key={schema}>
            {/* Schema Header */}
            <HStack mb={3} spacing={2}>
              <Icon as={FiDatabase} color="blue.500" />
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                {schema}
              </Text>
              <Badge colorScheme="blue" fontSize="xs">
                {schemaPages.length} tables
              </Badge>
            </HStack>

            {/* Database Table */}
            <Box
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              overflow="hidden"
              bg={bgColor}
            >
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr>
                    <Th>
                      <HStack spacing={2}>
                        <Icon as={FiTable} boxSize={3} />
                        <Text>Table Name</Text>
                      </HStack>
                    </Th>
                    <Th isNumeric>Columns</Th>
                    <Th isNumeric>Rows</Th>
                    <Th>Status</Th>
                    <Th>Last Synced</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {schemaPages
                    .sort((a, b) => a.table.localeCompare(b.table))
                    .map((page) => (
                      <Tr
                        key={page.id}
                        cursor="pointer"
                        onClick={() => onPageClick(page.id)}
                        _hover={{ bg: hoverBg }}
                        transition="background 0.15s"
                      >
                        <Td>
                          <HStack spacing={2}>
                            <Text fontWeight="medium" color={textColor}>
                              {page.table}
                            </Text>
                            {page.isLocked && (
                              <Tooltip label="Read-only (auto-synced)">
                                <span>
                                  <Icon as={FiLock} boxSize={3} color={useSemanticToken('text.tertiary')} />
                                </span>
                              </Tooltip>
                            )}
                          </HStack>
                        </Td>
                        <Td isNumeric>
                          <Text color={mutedColor}>{page.columnCount}</Text>
                        </Td>
                        <Td isNumeric>
                          <Text color={mutedColor}>
                            {page.rowCount > 0 ? page.rowCount.toLocaleString() : '-'}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme="green" fontSize="xs">
                            Synced
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="xs" color={mutedColor}>
                            {new Date(page.lastSynced).toLocaleDateString()}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
