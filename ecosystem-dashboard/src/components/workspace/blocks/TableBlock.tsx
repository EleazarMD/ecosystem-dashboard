/**
 * TableBlock - Simple table renderer for table blocks
 * Displays editable tables with rows and columns
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
  Input,
  IconButton,
  HStack,
  Button,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TableBlockProps {
  blockId: string;
  columns: string[];
  rows?: string[][];
  onUpdate?: (data: { columns: string[]; rows: string[][] }) => void;
}

export function TableBlock({ blockId, columns: initialColumns, rows: initialRows = [], onUpdate }: TableBlockProps) {
  const [columns, setColumns] = useState<string[]>(initialColumns || ['Column 1', 'Column 2', 'Column 3']);
  const [rows, setRows] = useState<string[][]>(initialRows.length ? initialRows : [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ]);
  const [isEditing, setIsEditing] = useState(false);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);
    onUpdate?.({ columns, rows: newRows });
  };

  const handleColumnChange = (colIndex: number, value: string) => {
    const newColumns = [...columns];
    newColumns[colIndex] = value;
    setColumns(newColumns);
    onUpdate?.({ columns: newColumns, rows });
  };

  const addRow = () => {
    const newRow = columns.map(() => '');
    setRows([...rows, newRow]);
  };

  const addColumn = () => {
    const newColumns = [...columns, `Column ${columns.length + 1}`];
    setColumns(newColumns);
    const newRows = rows.map(row => [...row, '']);
    setRows(newRows);
  };

  const deleteRow = (rowIndex: number) => {
    setRows(rows.filter((_, i) => i !== rowIndex));
  };

  const deleteColumn = (colIndex: number) => {
    setColumns(columns.filter((_, i) => i !== colIndex));
    setRows(rows.map(row => row.filter((_, i) => i !== colIndex)));
  };

  return (
    <Box my={4} borderWidth="1px" borderRadius="md" overflow="hidden">
      {/* Table Controls */}
      <HStack p={2} bg={useSemanticToken('surface.base')} borderBottomWidth="1px" spacing={2}>
        <Button size="sm" leftIcon={<AddIcon />} onClick={addRow}>
          Add Row
        </Button>
        <Button size="sm" leftIcon={<AddIcon />} onClick={addColumn}>
          Add Column
        </Button>
      </HStack>

      {/* Table */}
      <Box overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead bg={useSemanticToken('surface.base')}>
            <Tr>
              {columns.map((col, colIndex) => (
                <Th key={colIndex} minW="150px">
                  <HStack spacing={1}>
                    {isEditing ? (
                      <Input
                        value={col}
                        onChange={(e) => handleColumnChange(colIndex, e.target.value)}
                        size="sm"
                        variant="unstyled"
                        fontWeight="bold"
                      />
                    ) : (
                      <Box flex={1}>{col}</Box>
                    )}
                    {columns.length > 1 && (
                      <IconButton
                        icon={<DeleteIcon />}
                        aria-label="Delete column"
                        size="xs"
                        variant="ghost"
                        onClick={() => deleteColumn(colIndex)}
                      />
                    )}
                  </HStack>
                </Th>
              ))}
              <Th w="50px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row, rowIndex) => (
              <Tr key={rowIndex} _hover={{ bg: 'gray.50' }}>
                {row.map((cell, colIndex) => (
                  <Td key={colIndex}>
                    <Input
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      size="sm"
                      variant="unstyled"
                      placeholder="Empty"
                      _placeholder={{ color: 'gray.400' }}
                    />
                  </Td>
                ))}
                <Td>
                  {rows.length > 1 && (
                    <IconButton
                      icon={<DeleteIcon />}
                      aria-label="Delete row"
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => deleteRow(rowIndex)}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

export default TableBlock;
