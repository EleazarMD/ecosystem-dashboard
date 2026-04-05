/**
 * DynamicTableView - Table view with dynamic property columns
 * Example integration of property system into table/database views
 */

import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Icon,
  HStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
import { PropertyCommandMenu } from './PropertyCommandMenu';
import { useAddPropertyButton } from '@/hooks/usePropertyCommand';
import { PropertyDefinition, PropertyType } from '@/lib/property-registry';
import { PropertyRow } from './PropertyField';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TableColumn {
  id: string;
  name: string;
  type: PropertyType;
  icon: string;
  width?: string;
  options?: Array<{ value: string; label: string; color?: string }>;
}

interface TableRow {
  id: string;
  [key: string]: any;
}

interface DynamicTableViewProps {
  databaseId: string;
  initialColumns?: TableColumn[];
  initialRows?: TableRow[];
  onAddColumn?: (column: TableColumn) => void;
  onRemoveColumn?: (columnId: string) => void;
  onUpdateCell?: (rowId: string, columnId: string, value: any) => void;
  onAddRow?: () => void;
}

export function DynamicTableView({
  databaseId,
  initialColumns = [],
  initialRows = [],
  onAddColumn,
  onRemoveColumn,
  onUpdateCell,
  onAddRow,
}: DynamicTableViewProps) {
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const headerBg = useSemanticToken('surface.raised');

  // Add column with property system
  const addColumn = useAddPropertyButton(
    (property: PropertyDefinition) => {
      const newColumn: TableColumn = {
        id: `col-${Date.now()}`,
        name: property.name,
        type: property.type,
        icon: property.icon,
        options: property.config?.hasOptions ? [] : undefined,
      };

      setColumns([...columns, newColumn]);
      onAddColumn?.(newColumn);
    },
    {
      view: 'table',
      hasDatabase: true,
    }
  );

  const handleRemoveColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
    onRemoveColumn?.(columnId);
  };

  const handleUpdateCell = (rowId: string, columnId: string, value: any) => {
    setRows(rows.map(row =>
      row.id === rowId ? { ...row, [columnId]: value } : row
    ));
    onUpdateCell?.(rowId, columnId, value);
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const handleAddRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
    };
    setRows([...rows, newRow]);
    onAddRow?.();
  };

  // Sort rows
  const sortedRows = [...rows];
  if (sortColumn) {
    sortedRows.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  return (
    <>
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              {columns.map((column) => (
                <Th
                  key={column.id}
                  borderBottom="2px solid"
                  borderColor={borderColor}
                  width={column.width}
                >
                  <HStack justify="space-between" spacing={2}>
                    {/* Column Header */}
                    <HStack
                      spacing={2}
                      cursor="pointer"
                      onClick={() => handleSort(column.id)}
                      flex={1}
                    >
                      <Text fontSize="lg">{column.icon}</Text>
                      <Text fontSize="xs" fontWeight="600" textTransform="uppercase">
                        {column.name}
                      </Text>
                      {sortColumn === column.id && (
                        <Icon
                          as={sortDirection === 'asc' ? FiArrowUp : FiArrowDown}
                          boxSize={3}
                        />
                      )}
                    </HStack>

                    {/* Column Menu */}
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<Icon as={FiMoreVertical} />}
                        variant="ghost"
                        size="xs"
                        aria-label="Column options"
                      />
                      <MenuList>
                        <MenuItem icon={<Icon as={FiEdit2} />}>
                          Edit property
                        </MenuItem>
                        <MenuItem icon={<Icon as={FiArrowUp} />}>
                          Sort ascending
                        </MenuItem>
                        <MenuItem icon={<Icon as={FiArrowDown} />}>
                          Sort descending
                        </MenuItem>
                        <MenuItem
                          icon={<Icon as={FiTrash2} />}
                          color="red.500"
                          onClick={() => handleRemoveColumn(column.id)}
                        >
                          Delete property
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </Th>
              ))}

              {/* Add Column Button */}
              <Th
                borderBottom="2px solid"
                borderColor={borderColor}
                width="60px"
              >
                <IconButton
                  ref={addColumn.buttonRef}
                  icon={<Icon as={FiPlus} />}
                  aria-label="Add column"
                  size="xs"
                  variant="ghost"
                  onClick={addColumn.openMenu}
                />
              </Th>
            </Tr>
          </Thead>

          <Tbody>
            {sortedRows.map((row) => (
              <Tr key={row.id} _hover={{ bg: hoverBg }}>
                {columns.map((column) => (
                  <Td key={column.id} borderColor={borderColor}>
                    <PropertyRow
                      propertyName={column.name}
                      propertyType={column.type}
                      propertyIcon={column.icon}
                      value={row[column.id]}
                      onChange={(value) => handleUpdateCell(row.id, column.id, value)}
                      options={column.options}
                    />
                  </Td>
                ))}

                {/* Row Actions */}
                <Td borderColor={borderColor}>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<Icon as={FiMoreVertical} />}
                      variant="ghost"
                      size="xs"
                      aria-label="Row options"
                    />
                    <MenuList>
                      <MenuItem icon={<Icon as={FiEdit2} />}>
                        Open page
                      </MenuItem>
                      <MenuItem
                        icon={<Icon as={FiTrash2} />}
                        color="red.500"
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}

            {/* Add Row */}
            <Tr>
              <Td colSpan={columns.length + 1} borderColor={borderColor}>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Icon as={FiPlus} />}
                  onClick={handleAddRow}
                  width="full"
                  justifyContent="flex-start"
                >
                  New row
                </Button>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>

      {/* Property Command Menu */}
      <PropertyCommandMenu
        isOpen={addColumn.isOpen}
        position={addColumn.position}
        context={addColumn.context}
        onClose={addColumn.closeMenu}
        onSelect={addColumn.handleSelect}
      />
    </>
  );
}

/**
 * Usage Example:
 * 
 * function DatabasePage() {
 *   const [columns, setColumns] = useState<TableColumn[]>([
 *     {
 *       id: 'name',
 *       name: 'Name',
 *       type: 'text',
 *       icon: '📝',
 *       width: '300px',
 *     },
 *     {
 *       id: 'status',
 *       name: 'Status',
 *       type: 'select',
 *       icon: '🏷️',
 *       options: [
 *         { value: 'todo', label: 'To Do', color: 'gray' },
 *         { value: 'in_progress', label: 'In Progress', color: 'blue' },
 *         { value: 'done', label: 'Done', color: 'green' },
 *       ],
 *     },
 *   ]);
 *   
 *   return (
 *     <DynamicTableView
 *       databaseId="db-123"
 *       initialColumns={columns}
 *       initialRows={[
 *         { id: 'row-1', name: 'Task 1', status: 'todo' },
 *         { id: 'row-2', name: 'Task 2', status: 'in_progress' },
 *       ]}
 *       onAddColumn={(column) => {
 *         setColumns([...columns, column]);
 *       }}
 *     />
 *   );
 * }
 */
