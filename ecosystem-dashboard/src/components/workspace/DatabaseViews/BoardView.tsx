/**
 * BoardView - Kanban board view for databases
 * Groups pages by select/multi-select property into columns
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
  Collapse,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, DragHandleIcon } from '@chakra-ui/icons';
import { Database, Block, DatabaseView, DatabaseProperty } from '../../../types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BoardViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

interface Column {
  id: string;
  name: string;
  color: string;
  pages: Block[];
}

export function BoardView({ database, pages, view, onUpdate }: BoardViewProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [groupByProperty, setGroupByProperty] = useState<DatabaseProperty | null>(null);
  const [propertyValues, setPropertyValues] = useState<Map<string, Map<string, any>>>(new Map());
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const bgColor = useSemanticToken('surface.base');
  const columnBg = useSemanticToken('surface.elevated');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    // Find first select or multi_select property as default group
    const selectProp = database.schema.find(
      p => p.type === 'select' || p.type === 'multi_select'
    );
    if (selectProp) {
      setGroupByProperty(selectProp);
    }
  }, [database]);

  useEffect(() => {
    if (groupByProperty) {
      loadPropertyValues();
    }
  }, [groupByProperty, pages]);

  const loadPropertyValues = async () => {
    const valuesMap = new Map<string, Map<string, any>>();
    
    for (const page of pages) {
      try {
        const response = await fetch(`/api/database/property-values/${page.id}`);
        if (response.ok) {
          const data = await response.json();
          valuesMap.set(page.id, new Map(Object.entries(data.values)));
        }
      } catch (error) {
        console.error(`Error loading values for page ${page.id}:`, error);
      }
    }

    setPropertyValues(valuesMap);
    organizeIntoColumns(valuesMap);
  };

  const organizeIntoColumns = (valuesMap: Map<string, Map<string, any>>) => {
    if (!groupByProperty) return;

    // Get all possible column values from property config
    const options = groupByProperty.config.options || [];
    const columnMap = new Map<string, Column>();

    // Initialize columns from options
    for (const option of options) {
      columnMap.set(option.name, {
        id: option.id,
        name: option.name,
        color: option.color || 'gray',
        pages: []
      });
    }

    // Add "No status" column for pages without values
    columnMap.set('__empty__', {
      id: '__empty__',
      name: 'No Status',
      color: 'gray',
      pages: []
    });

    // Distribute pages into columns
    for (const page of pages) {
      const value = valuesMap.get(page.id)?.get(groupByProperty.id);
      
      if (!value) {
        columnMap.get('__empty__')?.pages.push(page);
      } else if (groupByProperty.type === 'multi_select' && Array.isArray(value)) {
        // For multi-select, add to first matching column
        const firstValue = value[0];
        const column = columnMap.get(firstValue);
        if (column) {
          column.pages.push(page);
        } else {
          columnMap.get('__empty__')?.pages.push(page);
        }
      } else {
        const column = columnMap.get(value);
        if (column) {
          column.pages.push(page);
        } else {
          columnMap.get('__empty__')?.pages.push(page);
        }
      }
    }

    setColumns(Array.from(columnMap.values()));
  };

  const toggleColumn = (columnId: string) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(columnId)) {
      newCollapsed.delete(columnId);
    } else {
      newCollapsed.add(columnId);
    }
    setCollapsedColumns(newCollapsed);
  };

  const getPageTitle = (page: Block): string => {
    if (page.properties?.title && Array.isArray(page.properties.title)) {
      return page.properties.title.map(rt => rt.text?.content || '').join('') || 'Untitled';
    }
    return 'Untitled';
  };

  const getPropertyValue = (pageId: string, propId: string): any => {
    return propertyValues.get(pageId)?.get(propId) || null;
  };

  const visibleProperties = database.schema
    .filter(p => p.type !== 'title' && p.id !== groupByProperty?.id)
    .slice(0, 2); // Show max 2 additional properties

  const selectProperties = database.schema.filter(
    p => p.type === 'select' || p.type === 'multi_select'
  );

  if (!groupByProperty) {
    return (
      <Box p={12} textAlign="center" bg={columnBg} borderRadius="lg">
        <Text fontSize="4xl" mb={2}>📋</Text>
        <Text fontWeight="bold" mb={2}>No grouping property found</Text>
        <Text color={useSemanticToken('text.secondary')} mb={4}>
          Add a Select or Multi-select property to use Board view
        </Text>
        <Button colorScheme="blue" size="sm">
          Add Property
        </Button>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Toolbar */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Group by:</Text>
          <Menu>
            <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />}>
              {groupByProperty.name}
            </MenuButton>
            <MenuList>
              {selectProperties.map((prop) => (
                <MenuItem
                  key={prop.id}
                  onClick={() => setGroupByProperty(prop)}
                  bg={prop.id === groupByProperty.id ? 'blue.50' : undefined}
                >
                  {prop.name}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>

        <HStack spacing={2}>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            {pages.length} {pages.length === 1 ? 'card' : 'cards'}
          </Text>
        </HStack>
      </HStack>

      {/* Board Columns */}
      <Flex
        gap={4}
        overflowX="auto"
        pb={4}
        minH="500px"
      >
        {columns.map((column) => {
          const isCollapsed = collapsedColumns.has(column.id);
          
          return (
            <Box
              key={column.id}
              minW="280px"
              maxW="280px"
              bg={columnBg}
              borderRadius="lg"
              p={3}
              flexShrink={0}
            >
              {/* Column Header */}
              <HStack
                justify="space-between"
                mb={3}
                cursor="pointer"
                onClick={() => toggleColumn(column.id)}
              >
                <HStack spacing={2}>
                  <Badge colorScheme={column.color} fontSize="sm">
                    {column.name}
                  </Badge>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {column.pages.length}
                  </Text>
                </HStack>
                <IconButton
                  icon={<DragHandleIcon />}
                  size="xs"
                  variant="ghost"
                  aria-label="Drag column"
                />
              </HStack>

              {/* Column Cards */}
              <Collapse in={!isCollapsed} animateOpacity>
                <VStack spacing={2} align="stretch">
                  {column.pages.map((page) => (
                    <Box
                      key={page.id}
                      bg={cardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      p={3}
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{
                        transform: 'translateY(-2px)',
                        shadow: 'md'
                      }}
                      onClick={() => {
                        // Open page
                        router.push(`/workspace?page=${page.id}`, undefined, { shallow: true });
                      }}
                    >
                      <VStack spacing={2} align="stretch">
                        {/* Card Title */}
                        <Text fontWeight="medium" fontSize="sm" noOfLines={2}>
                          {getPageTitle(page)}
                        </Text>

                        {/* Additional Properties */}
                        {visibleProperties.length > 0 && (
                          <VStack spacing={1} align="stretch" pt={1}>
                            {visibleProperties.map((prop) => {
                              const value = getPropertyValue(page.id, prop.id);
                              if (!value) return null;

                              return (
                                <HStack key={prop.id} spacing={2} fontSize="xs">
                                  <Text color={useSemanticToken('text.secondary')} minW="50px">
                                    {prop.name}:
                                  </Text>
                                  {renderPropertyValue(prop, value)}
                                </HStack>
                              );
                            })}
                          </VStack>
                        )}

                        {/* Metadata */}
                        <HStack justify="space-between" pt={1}>
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            {new Date(page.updated_at).toLocaleDateString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  ))}

                  {/* Add Card Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<AddIcon />}
                    width="full"
                    justifyContent="flex-start"
                    onClick={() => {
                      // TODO: Create new page with this column's value
                    }}
                  >
                    Add card
                  </Button>
                </VStack>
              </Collapse>

              {/* Collapsed State */}
              {isCollapsed && (
                <Text fontSize="xs" color={useSemanticToken('text.tertiary')} textAlign="center">
                  Click to expand
                </Text>
              )}
            </Box>
          );
        })}

        {/* Add Column Button */}
        <Box
          minW="280px"
          bg={columnBg}
          borderRadius="lg"
          p={3}
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={borderColor}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          _hover={{ bg: 'gray.200' }}
        >
          <VStack>
            <AddIcon />
            <Text fontSize="sm" fontWeight="medium">Add Option</Text>
          </VStack>
        </Box>
      </Flex>

      {/* Empty State */}
      {pages.length === 0 && (
        <Box p={12} textAlign="center">
          <Text fontSize="4xl" mb={2}>📋</Text>
          <Text fontWeight="bold" mb={2}>No cards yet</Text>
          <Text color={useSemanticToken('text.secondary')} mb={4}>
            Add your first card to this board
          </Text>
          <Button colorScheme="blue" size="sm" leftIcon={<AddIcon />}>
            New Card
          </Button>
        </Box>
      )}
    </VStack>
  );
}

function renderPropertyValue(prop: any, value: any) {
  if (!value) {
    return null;
  }

  switch (prop.type) {
    case 'select':
      return (
        <Badge colorScheme="purple" fontSize="xs">
          {value}
        </Badge>
      );
    case 'multi_select':
      return (
        <HStack spacing={1}>
          {value.slice(0, 2).map((v: string, i: number) => (
            <Badge key={i} colorScheme="purple" fontSize="xs">
              {v}
            </Badge>
          ))}
          {value.length > 2 && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>+{value.length - 2}</Text>
          )}
        </HStack>
      );
    case 'checkbox':
      return <Text fontSize="xs">{value ? '✅' : '☐'}</Text>;
    case 'date':
      return <Text fontSize="xs">{new Date(value).toLocaleDateString()}</Text>;
    default:
      return <Text fontSize="xs" noOfLines={1}>{String(value)}</Text>;
  }
}

export default BoardView;
