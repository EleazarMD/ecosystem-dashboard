/**
 * BoardView - Notion-style board/kanban view
 * Organize database entries by Status or other Select properties
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Spinner,
  Icon,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiCalendar, FiTag, FiPlus, FiSettings, FiMoreVertical } from 'react-icons/fi';
import { PropertyCommandMenu } from './PropertyCommandMenu';
import { useAddPropertyButton } from '@/hooks/usePropertyCommand';
import { PropertyDefinition, PropertyType } from '@/lib/property-registry';
import { PropertyFieldCompact } from './PropertyField';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CardProperty {
  id: string;
  name: string;
  type: PropertyType;
  icon: string;
  value: any;
  options?: Array<{ value: string; label: string; color?: string }>;
}

interface BoardCard {
  id: string;
  title: string;
  date?: string;
  tags?: string[];
  status: string;
  properties?: CardProperty[];
}

interface BoardColumn {
  id: string;
  title: string;
  cards: BoardCard[];
  color: string;
}

interface BoardViewProps {
  databaseId: string;
  onCardClick: (cardId: string) => void;
  groupBy?: string; // Property to group by (default: Status)
  onCardMove?: (cardId: string, newStatus: string) => Promise<void>;
}

export function BoardView({ 
  databaseId, 
  onCardClick,
  groupBy = 'Status',
  onCardMove
}: BoardViewProps) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState<BoardCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [visibleProperties, setVisibleProperties] = useState<CardProperty[]>([]);
  
  const bgColor = useSemanticToken('surface.elevated');
  const columnBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  
  // Property system integration
  const addProperty = useAddPropertyButton(
    (property: PropertyDefinition) => {
      const newProperty: CardProperty = {
        id: `prop-${Date.now()}`,
        name: property.name,
        type: property.type,
        icon: property.icon,
        value: null,
        options: property.config?.hasOptions ? [] : undefined,
      };
      setVisibleProperties([...visibleProperties, newProperty]);
    },
    {
      view: 'board',
      hasDatabase: true,
    }
  );

  useEffect(() => {
    loadBoardData();
  }, [databaseId, groupBy]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks/${databaseId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Get schema to determine columns
        const schema = data.block?.properties?.database_schema || {};
        const statusProperty = schema[groupBy];
        
        if (statusProperty && statusProperty.type === 'select' && statusProperty.options) {
          const columnMap = new Map<string, BoardColumn>();
          
          // Initialize columns from schema options
          statusProperty.options.forEach((option: any) => {
            columnMap.set(option.name, {
              id: option.name,
              title: option.name,
              cards: [],
              color: option.color || 'gray'
            });
          });
          
          // Distribute cards into columns
          (data.children || []).forEach((entry: any) => {
            const status = entry.properties?.[groupBy]?.select?.name || 'Uncategorized';
            const card: BoardCard = {
              id: entry.id,
              title: entry.properties?.Name?.[0]?.text?.content || 'Untitled',
              date: entry.properties?.Date?.date?.start,
              tags: entry.properties?.Tags?.multi_select?.map((t: any) => t.name) || [],
              status
            };
            
            if (!columnMap.has(status)) {
              columnMap.set(status, {
                id: status,
                title: status,
                cards: [],
                color: 'gray'
              });
            }
            
            columnMap.get(status)!.cards.push(card);
          });
          
          setColumns(Array.from(columnMap.values()));
        }
      }
    } catch (error) {
      console.error('Failed to load board data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorScheme = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'gray',
      brown: 'orange',
      orange: 'orange',
      yellow: 'yellow',
      green: 'green',
      blue: 'blue',
      purple: 'purple',
      pink: 'pink',
      red: 'red'
    };
    return colorMap[color] || 'gray';
  };

  const handleCardDragStart = (e: React.DragEvent, card: BoardCard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    
    if (draggedCard && draggedCard.status !== columnId && onCardMove) {
      try {
        await onCardMove(draggedCard.id, columnId);
        await loadBoardData(); // Refresh board
      } catch (error) {
        console.error('Failed to move card:', error);
      }
    }
    
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverColumn(null);
  };

  if (loading) {
    return (
      <VStack py={10} spacing={4}>
        <Spinner size="lg" />
        <Text color={mutedColor}>Loading board...</Text>
      </VStack>
    );
  }

  return (
    <>
      <Box px={8} overflowX="auto">
        {/* Properties Header */}
        <HStack justify="space-between" mb={4} pb={3} borderBottom="1px solid" borderColor={borderColor}>
          <HStack spacing={4}>
            <Text fontSize="sm" fontWeight="600" color={mutedColor}>
              PROPERTIES
            </Text>
            <HStack spacing={2}>
              {visibleProperties.map(prop => (
                <Badge key={prop.id} colorScheme="gray" fontSize="xs">
                  {prop.icon} {prop.name}
                </Badge>
              ))}
            </HStack>
          </HStack>
          
          <Button
            ref={addProperty.buttonRef}
            onClick={addProperty.openMenu}
            size="sm"
            leftIcon={<Icon as={FiPlus} />}
            variant="ghost"
          >
            Add Property
          </Button>
        </HStack>
        
        {/* Board Columns */}
        <HStack align="flex-start" spacing={4} pb={4}>
          {columns.map((column) => (
          <VStack
            key={column.id}
            minW="280px"
            maxW="280px"
            bg={dragOverColumn === column.id ? 'blue.50' : columnBg}
            borderRadius="md"
            p={3}
            align="stretch"
            spacing={3}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column.id)}
            border="2px solid"
            borderColor={dragOverColumn === column.id ? 'blue.400' : 'transparent'}
            transition="all 0.2s"
          >
            {/* Column Header */}
            <HStack justify="space-between">
              <HStack>
                <Badge colorScheme={getColorScheme(column.color)} fontSize="xs">
                  {column.title}
                </Badge>
                <Text fontSize="sm" color={mutedColor}>
                  {column.cards.length}
                </Text>
              </HStack>
            </HStack>
            
            {/* Cards */}
            <VStack spacing={2} align="stretch">
              {column.cards.map((card) => (
                <Box
                  key={card.id}
                  bg={cardBg}
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderColor}
                  cursor={draggedCard?.id === card.id ? 'grabbing' : 'grab'}
                  transition="all 0.2s"
                  _hover={{ 
                    bg: hoverBg,
                    borderColor: 'blue.400',
                    transform: 'translateY(-1px)',
                    boxShadow: 'sm'
                  }}
                  onClick={() => onCardClick(card.id)}
                  draggable
                  onDragStart={(e) => handleCardDragStart(e, card)}
                  onDragEnd={handleDragEnd}
                  opacity={draggedCard?.id === card.id ? 0.5 : 1}
                >
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="500" fontSize="sm" noOfLines={3}>
                      {card.title}
                    </Text>
                    
                    {card.date && (
                      <HStack spacing={1} fontSize="xs" color={mutedColor}>
                        <Icon as={FiCalendar} boxSize={3} />
                        <Text>{new Date(card.date).toLocaleDateString()}</Text>
                      </HStack>
                    )}
                    
                    {card.tags && card.tags.length > 0 && (
                      <HStack spacing={1} flexWrap="wrap">
                        {card.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} colorScheme="blue" fontSize="xs">
                            {tag}
                          </Badge>
                        ))}
                        {card.tags.length > 2 && (
                          <Text fontSize="xs" color={mutedColor}>
                            +{card.tags.length - 2}
                          </Text>
                        )}
                      </HStack>
                    )}
                    
                    {/* Dynamic Properties */}
                    {card.properties && card.properties.length > 0 && (
                      <VStack align="stretch" spacing={1} mt={1}>
                        {card.properties.slice(0, 3).map(prop => (
                          <PropertyFieldCompact
                            key={prop.id}
                            propertyName={prop.name}
                            propertyType={prop.type}
                            propertyIcon={prop.icon}
                            value={prop.value}
                            options={prop.options}
                          />
                        ))}
                        {card.properties.length > 3 && (
                          <Text fontSize="xs" color={mutedColor}>
                            +{card.properties.length - 3} more properties
                          </Text>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </Box>
              ))}
              
              {column.cards.length === 0 && (
                <Text fontSize="sm" color={mutedColor} textAlign="center" py={4}>
                  No items
                </Text>
              )}
            </VStack>
          </VStack>
        ))}
      </HStack>
    </Box>
      
      {/* Property Command Menu */}
      <PropertyCommandMenu
        isOpen={addProperty.isOpen}
        position={addProperty.position}
        context={addProperty.context}
        onClose={addProperty.closeMenu}
        onSelect={addProperty.handleSelect}
      />
    </>
  );
}
