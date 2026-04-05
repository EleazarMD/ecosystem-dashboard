/**
 * TableBlock - Notion-style table component
 * Minimalist design with inline controls
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
  Input,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TableBlockProps {
  rows?: number;
  cols?: number;
  data?: string[][];
  onChange?: (data: string[][]) => void;
}

export function TableBlock({
  rows = 3,
  cols = 3,
  data: initialData,
  onChange
}: TableBlockProps) {
  // Initialize table data
  const [data, setData] = useState<string[][]>(() => {
    if (initialData && initialData.length > 0) return initialData;
    return Array(rows).fill(null).map(() => Array(cols).fill(''));
  });

  // Update local state if prop changes (e.g. from external load)
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData);
    }
  }, [initialData]);

  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const inputHoverBg = useSemanticToken('surface.hover');
  const headerTextColor = useSemanticToken('text.primary');

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
        : row
    );
    setData(newData);
    onChange?.(newData);
  };

  const addRow = () => {
    const newData = [...data, Array(data[0].length).fill('')];
    setData(newData);
    onChange?.(newData);
  };

  const addColumn = () => {
    const newData = data.map(row => [...row, '']);
    setData(newData);
    onChange?.(newData);
  };

  return (
    <Box overflowX="auto" className="notion-table-block">
      <Flex direction="column">
        <Flex>
          <Table
            size="sm"
            variant="simple"
            sx={{
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              width: 'auto',
              minWidth: '100%'
            }}
          >
            <Thead bg={headerBg}>
              <Tr>
                {data[0]?.map((_, colIndex) => (
                  <Th
                    key={colIndex}
                    border="1px solid"
                    borderColor={borderColor}
                    p={0}
                    width="150px"
                    fontWeight="normal"
                    textTransform="none"
                    color="gray.500"
                  >
                    <Box bg={headerBg} p={2}>
                      <Input
                        value={data[0][colIndex]}
                        onChange={(e) => updateCell(0, colIndex, e.target.value)}
                        placeholder={colIndex === 0 ? "Name" : "Property"}
                        size="sm"
                        variant="unstyled"
                        fontWeight="600"
                        color={headerTextColor}
                        _placeholder={{ color: 'gray.400' }}
                        h="auto"
                      />
                    </Box>
                  </Th>
                ))}
                {/* Add Column Button Header */}
                <Th
                  width="40px"
                  p={0}
                  borderBottom="1px solid"
                  borderColor={borderColor}
                  bg="transparent"
                >
                  <IconButton
                    aria-label="Add column"
                    icon={<FiPlus />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ bg: inputHoverBg, color: 'gray.600' }}
                    onClick={addColumn}
                    h="100%"
                    w="100%"
                    borderRadius={0}
                  />
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.slice(1).map((row, rowIndex) => (
                <Tr key={rowIndex + 1}>
                  {row.map((cell, colIndex) => (
                    <Td
                      key={colIndex}
                      border="1px solid"
                      borderColor={borderColor}
                      p={0}
                    >
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(rowIndex + 1, colIndex, e.target.value)}
                        placeholder=""
                        size="sm"
                        variant="unstyled"
                        p={2}
                        h="100%"
                        borderRadius={0}
                        _focus={{ bg: inputHoverBg }}
                        _hover={{ bg: inputHoverBg }}
                      />
                    </Td>
                  ))}
                  {/* Empty cell for add column column */}
                  <Td border="none" p={0} />
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Flex>

        {/* Add Row Button */}
        <Box
          borderBottom="1px solid"
          borderLeft="1px solid"
          borderRight="1px solid"
          borderColor={borderColor}
          borderTop="none"
          p={1}
          cursor="pointer"
          color="gray.400"
          _hover={{ bg: inputHoverBg, color: 'gray.600' }}
          onClick={addRow}
          transition="all 0.2s"
          display="flex"
          alignItems="center"
          fontSize="sm"
        >
          <FiPlus style={{ marginRight: '8px' }} /> New
        </Box>
      </Flex>
    </Box>
  );
}

export default TableBlock;
