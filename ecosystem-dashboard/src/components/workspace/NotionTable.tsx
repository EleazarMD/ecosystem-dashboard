/**
 * Notion-Style Table Component
 * Inline editable table with filters, sorting, and views
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Select,
  IconButton,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Text,
  Checkbox,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreHorizontal,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiEye,
} from 'react-icons/fi';

export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | 'email';
  options?: string[]; // For select type
  width?: number;
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

interface NotionTableProps {
  columns: TableColumn[];
  rows: TableRow[];
  onCellEdit?: (rowId: string, columnId: string, value: any) => void;
  onRowAdd?: () => void;
  onRowDelete?: (rowId: string) => void;
  onColumnAdd?: () => void;
  title?: string;
  icon?: string;
}

export function NotionTable({
  columns,
  rows,
  onCellEdit,
  onRowAdd,
  onRowDelete,
  onColumnAdd,
  title,
  icon,
}: NotionTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const handleCellClick = (rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId });
  };

  const handleCellChange = (rowId: string, columnId: string, value: any) => {
    onCellEdit?.(rowId, columnId, value);
    setEditingCell(null);
  };

  const renderCellContent = (row: TableRow, column: TableColumn) => {
    const value = row[column.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

    if (isEditing) {
      switch (column.type) {
        case 'select':
          return (
            <Select
              size="sm"
              value={value || ''}
              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
            >
              <option value="">Select...</option>
              {column.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          );

        case 'checkbox':
          return (
            <Checkbox
              isChecked={value || false}
              onChange={(e) => handleCellChange(row.id, column.id, e.target.checked)}
            />
          );

        case 'date':
          return (
            <Input
              type="date"
              size="sm"
              value={value || ''}
              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              autoFocus
            />
          );

        default:
          return (
            <Input
              size="sm"
              value={value || ''}
              onChange={(e) => handleCellChange(row.id, column.id, e.target.value)}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingCell(null);
                }
              }}
              autoFocus
            />
          );
      }
    }

    // Display mode
    switch (column.type) {
      case 'checkbox':
        return <Checkbox isChecked={value || false} isReadOnly />;

      case 'select':
        return value ? (
          <Badge colorScheme="blue" fontSize="xs">
            {value}
          </Badge>
        ) : (
          <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>
            Empty
          </Text>
        );

      case 'url':
        return value ? (
          <Text fontSize="sm" color="blue.500" textDecoration="underline" cursor="pointer">
            {value}
          </Text>
        ) : null;

      default:
        return (
          <Text fontSize="sm" color={value ? 'gray.700' : 'gray.400'}>
            {value || 'Empty'}
          </Text>
        );
    }
  };

  const sortedRows = React.useMemo(() => {
    if (!sortConfig) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.columnId];
      const bVal = b[sortConfig.columnId];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  const filteredRows = React.useMemo(() => {
    return sortedRows.filter((row) => {
      return Object.entries(filters).every(([columnId, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(row[columnId] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });
  }, [sortedRows, filters]);

  return (
    <Box>
      {/* Table Header */}
      {title && (
        <HStack justify="space-between" mb={4}>
          <HStack spacing={2}>
            {icon && <Text fontSize="xl">{icon}</Text>}
            <Text fontSize="lg" fontWeight="600">
              {title}
            </Text>
          </HStack>
          <HStack spacing={2}>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiFilter />}
                size="sm"
                variant="ghost"
                aria-label="Filter"
              />
              <MenuList>
                <MenuItem>Add filter</MenuItem>
                <MenuItem>Clear filters</MenuItem>
              </MenuList>
            </Menu>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiEye />}
                size="sm"
                variant="ghost"
                aria-label="View options"
              />
              <MenuList>
                <MenuItem>Table view</MenuItem>
                <MenuItem>Board view</MenuItem>
                <MenuItem>Calendar view</MenuItem>
              </MenuList>
            </Menu>
            <IconButton
              icon={<FiPlus />}
              size="sm"
              variant="ghost"
              aria-label="Add column"
              onClick={onColumnAdd}
            />
          </HStack>
        </HStack>
      )}

      {/* Table */}
      <Box overflowX="auto" border="1px solid" borderColor={borderColor} borderRadius="md">
        <Table size="sm">
          <Thead bg={useSemanticToken('surface.base')}>
            <Tr>
              {columns.map((column) => (
                <Th key={column.id} width={column.width}>
                  <HStack justify="space-between">
                    <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.secondary')}>
                      {column.name}
                    </Text>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreHorizontal />}
                        size="xs"
                        variant="ghost"
                        aria-label="Column options"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<FiArrowUp />}
                          onClick={() => setSortConfig({ columnId: column.id, direction: 'asc' })}
                        >
                          Sort ascending
                        </MenuItem>
                        <MenuItem
                          icon={<FiArrowDown />}
                          onClick={() => setSortConfig({ columnId: column.id, direction: 'desc' })}
                        >
                          Sort descending
                        </MenuItem>
                        <MenuItem>Edit property</MenuItem>
                        <MenuItem color="red.500">Delete</MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </Th>
              ))}
              <Th width="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => (
              <Tr key={row.id} _hover={{ bg: hoverBg }}>
                {columns.map((column) => (
                  <Td
                    key={`${row.id}-${column.id}`}
                    cursor="pointer"
                    onClick={() => handleCellClick(row.id, column.id)}
                  >
                    {renderCellContent(row, column)}
                  </Td>
                ))}
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreHorizontal />}
                      size="xs"
                      variant="ghost"
                      aria-label="Row options"
                    />
                    <MenuList>
                      <MenuItem>Duplicate</MenuItem>
                      <MenuItem color="red.500" onClick={() => onRowDelete?.(row.id)}>
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Add Row Button */}
      <HStack
        mt={2}
        p={2}
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        borderRadius="md"
        onClick={onRowAdd}
      >
        <IconButton
          icon={<FiPlus />}
          size="xs"
          variant="ghost"
          aria-label="Add row"
          pointerEvents="none"
        />
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          New
        </Text>
      </HStack>
    </Box>
  );
}
