/**
 * TableView - Spreadsheet-style view for databases
 * Similar to Notion's table view with inline editing
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
  IconButton,
  Input,
  Select,
  Checkbox,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Editable,
  EditableInput,
  EditablePreview,
  Text,
} from '@chakra-ui/react';
import { AddIcon, ChevronDownIcon, DragHandleIcon } from '@chakra-ui/icons';
import { Database, Block, DatabaseView, DatabaseProperty } from '../../../types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

import { DatabaseToolbar } from './DatabaseToolbar';

interface TableViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

export function TableView({ database, pages, view, onUpdate }: TableViewProps) {
  const [propertyValues, setPropertyValues] = useState<Map<string, Map<string, any>>>(new Map());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ pageId: string; propId: string } | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const headerBg = useSemanticToken('surface.base');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pages based on search
  const filteredPages = pages.filter(page => {
    if (!searchQuery) return true;
    const title = getPageTitle(page).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    loadPropertyValues();
  }, [pages]);

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
  };

  const getPropertyValue = (pageId: string, propId: string): any => {
    return propertyValues.get(pageId)?.get(propId) || null;
  };

  const updatePropertyValue = async (pageId: string, propId: string, value: any) => {
    try {
      const response = await fetch(`/api/database/property-values/${pageId}/${propId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        // Update local state
        const pageValues = propertyValues.get(pageId) || new Map();
        pageValues.set(propId, value);
        setPropertyValues(new Map(propertyValues));
        setEditingCell(null);
      }
    } catch (error) {
      console.error('Error updating property value:', error);
    }
  };

  const toggleRowSelection = (pageId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedRows(newSelection);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === pages.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pages.map(p => p.id)));
    }
  };

  const getPageTitle = (page: Block): string => {
    if (page.properties?.title && Array.isArray(page.properties.title)) {
      return page.properties.title.map(rt => rt.text?.content || '').join('') || 'Untitled';
    }
    return 'Untitled';
  };

  const renderCellEditor = (page: Block, prop: DatabaseProperty) => {
    const value = getPropertyValue(page.id, prop.id);
    const isEditing = editingCell?.pageId === page.id && editingCell?.propId === prop.id;

    if (!isEditing) {
      return (
        <Box
          onClick={() => setEditingCell({ pageId: page.id, propId: prop.id })}
          cursor="pointer"
          p={2}
          minH="40px"
          _hover={{ bg: hoverBg }}
        >
          {renderPropertyValue(prop, value)}
        </Box>
      );
    }

    return renderPropertyEditor(page.id, prop, value);
  };

  const renderPropertyEditor = (pageId: string, prop: DatabaseProperty, value: any) => {
    switch (prop.type) {
      case 'rich_text':
      case 'title':
        return (
          <Input
            autoFocus
            defaultValue={value || ''}
            size="sm"
            onBlur={(e) => updatePropertyValue(pageId, prop.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updatePropertyValue(pageId, prop.id, e.currentTarget.value);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
          />
        );

      case 'number':
        return (
          <Input
            autoFocus
            type="number"
            defaultValue={value || ''}
            size="sm"
            onBlur={(e) => updatePropertyValue(pageId, prop.id, parseFloat(e.target.value) || null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updatePropertyValue(pageId, prop.id, parseFloat(e.currentTarget.value) || null);
              }
            }}
          />
        );

      case 'select':
        return (
          <Select
            autoFocus
            size="sm"
            value={value || ''}
            onChange={(e) => updatePropertyValue(pageId, prop.id, e.target.value)}
          >
            <option value="">None</option>
            {prop.config.options?.map((opt: any) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </Select>
        );

      case 'checkbox':
        return (
          <Checkbox
            isChecked={value || false}
            onChange={(e) => updatePropertyValue(pageId, prop.id, e.target.checked)}
          />
        );

      case 'date':
        return (
          <Input
            autoFocus
            type="date"
            size="sm"
            defaultValue={value || ''}
            onChange={(e) => updatePropertyValue(pageId, prop.id, e.target.value)}
          />
        );

      default:
        return (
          <Input
            autoFocus
            defaultValue={value || ''}
            size="sm"
            onBlur={(e) => updatePropertyValue(pageId, prop.id, e.target.value)}
          />
        );
    }
  };

  const renderPropertyValue = (prop: DatabaseProperty, value: any) => {
    if (!value) {
      return <Box color={useSemanticToken('text.tertiary')} fontSize="sm">Empty</Box>;
    }

    switch (prop.type) {
      case 'checkbox':
        return <Checkbox isChecked={value} isReadOnly />;

      case 'select':
        return (
          <Box
            as="span"
            px={2}
            py={1}
            borderRadius="md"
            bg="blue.100"
            color="blue.800"
            fontSize="sm"
          >
            {value}
          </Box>
        );

      case 'date':
        return <Box fontSize="sm">{new Date(value).toLocaleDateString()}</Box>;

      case 'number':
        const format = prop.config.format || 'number';
        return <Box fontSize="sm">{formatNumber(value, format)}</Box>;

      default:
        return <Box fontSize="sm" noOfLines={1}>{String(value)}</Box>;
    }
  };

  const handleNewPage = async () => {
    try {
      const response = await fetch(`/api/workspace/${database.workspace_id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page',
          parent_id: database.block_id,
          properties: {
            title: [{ type: 'text', text: { content: 'Untitled' } }]
          }
        })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating new page:', error);
    }
  };

  return (
    <Box overflowX="auto" bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
      <DatabaseToolbar
        onSearch={setSearchQuery}
        onFilter={() => console.log('Filter clicked')}
        onSort={() => console.log('Sort clicked')}
        onNew={handleNewPage}
        viewName={view.name}
      />
      <Table variant="simple" size="sm" sx={{ tableLayout: 'fixed' }}>
        <Thead bg={useSemanticToken('surface.sunken')}>
          <Tr>
            {/* Selection Column */}
            <Th width="50px" borderColor={borderColor} py={2}>
              <Checkbox
                isChecked={selectedRows.size === pages.length && pages.length > 0}
                isIndeterminate={selectedRows.size > 0 && selectedRows.size < pages.length}
                onChange={toggleAllRows}
                borderColor={borderColor}
              />
            </Th>

            {/* Title Column (always first) */}
            <Th minW="250px" width="300px" borderColor={borderColor} py={2}>
              <HStack spacing={2} color={useSemanticToken('text.secondary')}>
                <Text fontSize="xs" fontWeight="normal">Aa</Text>
                <Box fontSize="sm" fontWeight="normal" textTransform="none">Title</Box>
              </HStack>
            </Th>

            {/* Property Columns */}
            {database.schema.filter(p => p.type !== 'title').map((prop) => (
              <Th key={prop.id} minW="150px" borderColor={borderColor} py={2}>
                <HStack spacing={2} justify="space-between" color={useSemanticToken('text.secondary')}>
                  <HStack spacing={1.5}>
                    {/* Icon based on type */}
                    <Text fontSize="xs" fontWeight="normal">
                      {prop.type === 'number' ? '#' :
                        prop.type === 'select' ? '▼' :
                          prop.type === 'multi_select' ? '☰' :
                            prop.type === 'date' ? '📅' : 'T'}
                    </Text>
                    <Box fontSize="sm" fontWeight="normal" textTransform="none">{prop.name}</Box>
                  </HStack>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<ChevronDownIcon />}
                      size="xs"
                      variant="ghost"
                      color={useSemanticToken('text.tertiary')}
                    />
                    <MenuList>
                      <MenuItem fontSize="sm">Edit Property</MenuItem>
                      <MenuItem fontSize="sm">Rename</MenuItem>
                      <MenuItem fontSize="sm" color="red.500">Delete</MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
              </Th>
            ))}

            {/* Add Property Button */}
            <Th width="50px" borderColor={borderColor} py={2}>
              <IconButton
                icon={<AddIcon />}
                size="xs"
                variant="ghost"
                aria-label="Add property"
                color={useSemanticToken('text.tertiary')}
              />
            </Th>
          </Tr>
        </Thead>

        <Tbody>
          {filteredPages.map((page) => (
            <Tr
              key={page.id}
              _hover={{ bg: hoverBg }}
              bg={selectedRows.has(page.id) ? 'blue.50' : undefined}
            >
              {/* Selection */}
              <Td borderColor={borderColor}>
                <Checkbox
                  isChecked={selectedRows.has(page.id)}
                  onChange={() => toggleRowSelection(page.id)}
                  borderColor={borderColor}
                />
              </Td>

              {/* Title */}
              <Td borderColor={borderColor}>
                <Editable defaultValue={getPageTitle(page)} fontSize="sm">
                  <EditablePreview cursor="pointer" width="100%" />
                  <EditableInput />
                </Editable>
              </Td>

              {/* Properties */}
              {database.schema.filter(p => p.type !== 'title').map((prop) => (
                <Td key={prop.id} borderColor={borderColor}>
                  {renderCellEditor(page, prop)}
                </Td>
              ))}

              {/* Empty cell for add property button column */}
              <Td borderColor={borderColor} />
            </Tr>
          ))}

          {/* Add Row Button */}
          <Tr>
            <Td colSpan={database.schema.length + 3} borderColor="transparent" pt={2}>
              <Button
                leftIcon={<AddIcon />}
                size="sm"
                variant="ghost"
                color={useSemanticToken('text.secondary')}
                fontWeight="normal"
                justifyContent="flex-start"
                onClick={handleNewPage}
                _hover={{ bg: hoverBg }}
              >
                New
              </Button>
            </Td>
          </Tr>
        </Tbody>
      </Table>

      {/* Empty State */}
      {pages.length === 0 && (
        <Box p={12} textAlign="center">
          <Box fontSize="4xl" mb={2}>📊</Box>
          <Box fontWeight="bold" mb={2}>No pages yet</Box>
          <Box color={useSemanticToken('text.secondary')} mb={4}>
            Add your first page to this database
          </Box>
          <Button colorScheme="blue" size="sm" leftIcon={<AddIcon />}>
            New Page
          </Button>
        </Box>
      )}
    </Box>
  );
}

function formatNumber(value: number, format: string): string {
  switch (format) {
    case 'number_with_commas':
      return value.toLocaleString();
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'dollar':
      return `$${value.toLocaleString()}`;
    case 'euro':
      return `€${value.toLocaleString()}`;
    default:
      return String(value);
  }
}

export default TableView;
