/**
 * Column Layout Component
 * Side-by-side columns with draggable vertical divider (Notion-style)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Icon,
} from '@chakra-ui/react';
import { FiMove } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Column {
  id: string;
  title: string;
  icon?: string;
  items: ColumnItem[];
}

interface ColumnItem {
  id: string;
  text: string;
  icon?: string;
  completed?: boolean;
}

interface ColumnLayoutProps {
  columns: Column[];
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
  onColumnResize?: (columnIndex: number, width: number) => void;
}

export function ColumnLayout({ columns, onItemMove, onColumnResize }: ColumnLayoutProps) {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    columns.map(() => 100 / columns.length)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ item: ColumnItem; columnId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const dragBg = useSemanticToken('surface.highlight');

  const handleDividerDrag = (columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidths = [...columnWidths];
    const containerWidth = containerRef.current?.offsetWidth || 1000;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const newWidths = [...startWidths];
      newWidths[columnIndex] = Math.max(20, Math.min(80, startWidths[columnIndex] + deltaPercent));
      newWidths[columnIndex + 1] = Math.max(20, Math.min(80, startWidths[columnIndex + 1] - deltaPercent));

      setColumnWidths(newWidths);
      onColumnResize?.(columnIndex, newWidths[columnIndex]);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setIsDragging(true);
  };

  const handleItemDragStart = (item: ColumnItem, columnId: string) => {
    setDraggedItem({ item, columnId });
  };

  const handleItemDrop = (targetColumnId: string) => {
    if (draggedItem && draggedItem.columnId !== targetColumnId) {
      onItemMove?.(draggedItem.item.id, draggedItem.columnId, targetColumnId);
    }
    setDraggedItem(null);
  };

  return (
    <HStack
      ref={containerRef}
      align="stretch"
      spacing={0}
      w="100%"
      minH="300px"
      position="relative"
    >
      {columns.map((column, index) => (
        <React.Fragment key={column.id}>
          {/* Column */}
          <VStack
            align="stretch"
            spacing={3}
            width={`${columnWidths[index]}%`}
            p={4}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleItemDrop(column.id)}
          >
            {/* Column Header */}
            <HStack spacing={2} mb={2}>
              {column.icon && <Text fontSize="lg">{column.icon}</Text>}
              <Heading size="sm" fontWeight="600" color={useSemanticToken('text.primary')}>
                {column.title}
              </Heading>
            </HStack>

            {/* Column Items */}
            <VStack align="stretch" spacing={2}>
              {column.items.map((item) => (
                <Box
                  key={item.id}
                  p={2}
                  borderRadius="md"
                  cursor="grab"
                  bg={draggedItem?.item.id === item.id ? dragBg : 'white'}
                  _hover={{ bg: hoverBg }}
                  border="1px solid"
                  borderColor={borderColor}
                  draggable
                  onDragStart={() => handleItemDragStart(item, column.id)}
                  onDragEnd={() => setDraggedItem(null)}
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    {item.icon && <Text fontSize="sm">{item.icon}</Text>}
                    <Text
                      fontSize="sm"
                      color={useSemanticToken('text.primary')}
                      textDecoration={item.completed ? 'line-through' : 'none'}
                      opacity={item.completed ? 0.6 : 1}
                    >
                      {item.text}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* Empty State */}
            {column.items.length === 0 && (
              <Text fontSize="xs" color={useSemanticToken('text.tertiary')} textAlign="center" py={4}>
                Drop items here
              </Text>
            )}
          </VStack>

          {/* Draggable Divider */}
          {index < columns.length - 1 && (
            <Box
              position="relative"
              w="1px"
              bg={borderColor}
              cursor="col-resize"
              _hover={{
                bg: 'blue.400',
                '& .divider-handle': {
                  opacity: 1,
                },
              }}
              onMouseDown={(e) => handleDividerDrag(index, e)}
            >
              {/* Hover Handle */}
              <Box
                className="divider-handle"
                position="absolute"
                top="50%"
                left="-4px"
                transform="translateY(-50%)"
                bg="blue.400"
                p={1}
                borderRadius="sm"
                opacity={0}
                transition="opacity 0.2s"
              >
                <Icon as={FiMove} color="whiteAlpha.900" boxSize={3} />
              </Box>
            </Box>
          )}
        </React.Fragment>
      ))}
    </HStack>
  );
}
