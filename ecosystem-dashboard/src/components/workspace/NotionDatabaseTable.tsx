/**
 * NotionDatabaseTable - Proper Notion-style database table view
 * Displays database entries with properties as columns
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
  Button,
  Icon,
  Input,
  useToast,
} from '@chakra-ui/react';
import {
  FiPlus, FiCalendar, FiTag, FiFilter, FiSearch, FiMoreHorizontal,
  FiArrowDown, FiArrowUp, FiLayout, FiZap, FiMaximize2, FiChevronDown, FiMoreVertical
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Select,
} from '@chakra-ui/react';

interface DatabaseEntry {
  id: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
}

interface NotionDatabaseTableProps {
  databaseId: string;
  workspaceId: string;
  onPageClick: (pageId: string) => void;
}

export function NotionDatabaseTable({ databaseId, workspaceId, onPageClick }: NotionDatabaseTableProps) {
  const [entries, setEntries] = useState<DatabaseEntry[]>([]);
  const [schema, setSchema] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState('text');
  const [isAddingProp, setIsAddingProp] = useState(false);

  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = 'transparent'; // Removed border
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const theadBg = 'transparent'; // Removed gray header background

  useEffect(() => {
    loadDatabaseEntries();
  }, [databaseId]);

  // Real-time updates
  useRealTimeSync({
    workspaceId,
    enabled: true,
    onBlockCreated: (block) => {
      if (block.parent_id === databaseId) {
        loadDatabaseEntries();
      }
    },
    onBlockUpdated: (block) => {
      if (block.parent_id === databaseId || block.id === databaseId) {
        loadDatabaseEntries();
      }
    },
    onBlockDeleted: (blockId) => {
      // We can't easily check parent_id of deleted block without cache, 
      // but we can just reload if we suspect it might be relevant
      // For now, let's just reload to be safe if it's in our list
      if (entries.some(e => e.id === blockId)) {
        loadDatabaseEntries();
      }
    }
  });

  const loadDatabaseEntries = async () => {
    try {
      setLoading(true);

      // Load database block to get schema
      const dbResponse = await fetch(`/api/blocks/${databaseId}?t=${Date.now()}`);
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        console.log('[NotionDatabaseTable] Loaded DB data:', dbData);

        // Fix: dbData is the block itself, not { block: ... }
        const dbSchema = dbData.properties?.database_schema || {};
        console.log('[NotionDatabaseTable] Schema:', dbSchema);
        setSchema(dbSchema);

        // Load child pages (entries)
        const entriesData = dbData.children || [];
        console.log('[NotionDatabaseTable] Entries:', entriesData.length);
        setEntries(entriesData);
      } else {
        console.error('[NotionDatabaseTable] Failed to fetch DB:', dbResponse.status);
      }
    } catch (error) {
      console.error('Failed to load database entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntryTitle.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for the new entry',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page',
          parent_id: databaseId,
          properties: {
            Name: [{
              type: 'text',
              text: { content: newEntryTitle }
            }]
          },
          created_by: 'eleazar'
        })
      });

      if (response.ok) {
        toast({
          title: 'Entry added',
          status: 'success',
          duration: 2000,
        });
        setNewEntryTitle('');
        setAddingNew(false);
        await loadDatabaseEntries();
      }
    } catch (error) {
      console.error('Failed to add entry:', error);
      toast({
        title: 'Failed to add entry',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (rowId: string, colKey: string, currentValue: any) => {
    setEditingCell({ rowId, colKey });

    // Initialize edit value based on type
    const type = schema[colKey]?.type;
    if (type === 'text' || type === 'title' || type === 'rich_text') {
      setEditValue(currentValue?.[0]?.text?.content || '');
    } else if (type === 'date') {
      setEditValue(currentValue?.date?.start || '');
    } else if (type === 'select') {
      setEditValue(currentValue?.select?.name || '');
    } else if (type === 'multi_select') {
      // For simple editing, we'll just join by comma
      setEditValue(currentValue?.multi_select?.map((o: any) => o.name).join(', ') || '');
    }
  };

  const handleCellUpdate = async () => {
    if (!editingCell) return;

    const { rowId, colKey } = editingCell;
    const propertyId = schema[colKey]?.id;
    const type = schema[colKey]?.type;

    if (!propertyId) return;

    try {
      // Format value based on type
      let formattedValue: any = editValue;

      if (type === 'text' || type === 'title' || type === 'rich_text') {
        formattedValue = [{ text: { content: editValue } }];
      } else if (type === 'date') {
        formattedValue = { start: editValue };
      } else if (type === 'select') {
        formattedValue = { name: editValue };
      } else if (type === 'multi_select') {
        // Simple comma separation for now
        formattedValue = editValue.split(',').map(s => ({ name: s.trim() })).filter(o => o.name);
      }

      const response = await fetch(`/api/database/property-values/${rowId}/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: formattedValue })
      });

      if (response.ok) {
        // Optimistic update or reload
        loadDatabaseEntries();
      }
    } catch (error) {
      console.error('Failed to update cell:', error);
      toast({ title: 'Update failed', status: 'error' });
    } finally {
      setEditingCell(null);
    }
  };

  const renderPropertyValue = (property: any, propertyType: string, rowId: string, colKey: string) => {
    const isEditing = editingCell?.rowId === rowId && editingCell?.colKey === colKey;

    if (isEditing) {
      return (
        <Input
          size="sm"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellUpdate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCellUpdate();
            if (e.key === 'Escape') setEditingCell(null);
          }}
          autoFocus
        />
      );
    }

    if (!property) return <Text color={mutedColor} cursor="pointer" onClick={() => handleCellClick(rowId, colKey, property)}>Empty</Text>;

    const content = (() => {
      switch (propertyType) {
        case 'title':
          return <Text fontWeight="500">{property[0]?.text?.content || 'Untitled'}</Text>;

        case 'date':
          if (property.date?.start) {
            return (
              <HStack spacing={1}>
                <Icon as={FiCalendar} boxSize={3} color={mutedColor} />
                <Text fontSize="sm">{new Date(property.date.start).toLocaleDateString()}</Text>
              </HStack>
            );
          }
          return <Text color={mutedColor}>No date</Text>;

        case 'multi_select':
          if (property.multi_select && property.multi_select.length > 0) {
            return (
              <HStack spacing={1} flexWrap="wrap">
                {property.multi_select.map((option: any, idx: number) => (
                  <Badge key={idx} colorScheme="blue" fontSize="xs">
                    {option.name}
                  </Badge>
                ))}
              </HStack>
            );
          }
          return <Text color={mutedColor}>No tags</Text>;

        case 'select':
          if (property.select?.name) {
            return (
              <Badge colorScheme="green" fontSize="xs">
                {property.select.name}
              </Badge>
            );
          }
          return <Text color={mutedColor}>Not set</Text>;

        case 'rich_text':
        case 'text':
          return <Text>{property[0]?.text?.content || ''}</Text>;

        case 'number':
          return <Text>{typeof property === 'number' ? property : property?.number ?? '-'}</Text>;

        case 'checkbox':
          return <Text>{property === true || property?.checkbox ? '✓' : '✗'}</Text>;

        case 'url':
          return property ? <Text color="blue.500" fontSize="sm" noOfLines={1}>{String(property)}</Text> : <Text color={mutedColor}>-</Text>;

        case 'relation':
          if (Array.isArray(property) && property.length > 0) {
            return (
              <HStack spacing={1} flexWrap="wrap">
                {property.map((rel: any, idx: number) => (
                  <Badge key={idx} colorScheme="purple" fontSize="xs" cursor="pointer">
                    {rel.title || rel.name || 'Linked'}
                  </Badge>
                ))}
              </HStack>
            );
          }
          return <Text color={mutedColor}>No relations</Text>;

        case 'rollup':
          if (property?.value !== undefined) {
            return <Text fontWeight="500">{String(property.value)}{property.function === 'percent_empty' || property.function === 'percent_not_empty' ? '%' : ''}</Text>;
          }
          return <Text color={mutedColor}>-</Text>;

        case 'formula':
          if (property?.result !== undefined) {
            const result = property.result;
            if (result.error) return <Text color="red.500" fontSize="xs">⚠ {result.error}</Text>;
            if (result.type === 'boolean') return <Text>{result.value ? '✓' : '✗'}</Text>;
            return <Text>{String(result.value)}</Text>;
          }
          return <Text color={mutedColor}>-</Text>;

        default:
          return <Text color={mutedColor}>-</Text>;
      }
    })();

    return <Box onClick={() => handleCellClick(rowId, colKey, property)} cursor="pointer" minH="20px" w="full">{content}</Box>;
  };

  if (loading) {
    return (
      <VStack py={10} spacing={4}>
        <Spinner size="lg" />
        <Text color={mutedColor}>Loading entries...</Text>
      </VStack>
    );
  }

  const propertyKeys = Object.keys(schema);

  const handleAddProperty = async () => {
    if (!newPropName.trim()) return;

    try {
      const response = await fetch(`/api/database/${databaseId}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPropName,
          type: newPropType,
          config: {}
        })
      });

      if (response.ok) {
        toast({ title: 'Column added', status: 'success' });
        setNewPropName('');
        setIsAddingProp(false);
        loadDatabaseEntries();
      }
    } catch (error) {
      console.error('Failed to add property:', error);
    }
  };

  return (
    <Box>
      {/* Toolbar */}
      <HStack mb={3} px={8} justify="space-between" align="center">
        {/* Left: Views */}
        <HStack spacing={1}>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Icon as={FiLayout} />}
            bg="gray.100"
            color={textColor}
            fontWeight="500"
            fontSize="sm"
            _hover={{ bg: 'gray.200' }}
          >
            Full schedule
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Icon as={FiCalendar} />}
            color={mutedColor}
            fontWeight="normal"
            fontSize="sm"
            _hover={{ bg: 'gray.100' }}
          >
            Calendar view
          </Button>
        </HStack>

        {/* Right: Actions */}
        <HStack spacing={1}>
          <Button size="xs" variant="ghost" color={mutedColor} p={1} _hover={{ bg: 'gray.100' }}><Icon as={FiFilter} boxSize={4} /></Button>
          <Button size="xs" variant="ghost" color={mutedColor} p={1} _hover={{ bg: 'gray.100' }}><Icon as={FiArrowDown} boxSize={4} /></Button>
          <Button size="xs" variant="ghost" color={mutedColor} p={1} _hover={{ bg: 'gray.100' }}><Icon as={FiZap} boxSize={4} /></Button>
          <Button size="xs" variant="ghost" color={mutedColor} p={1} _hover={{ bg: 'gray.100' }}><Icon as={FiSearch} boxSize={4} /></Button>
          <Button size="xs" variant="ghost" color={mutedColor} p={1} _hover={{ bg: 'gray.100' }}><Icon as={FiMaximize2} boxSize={4} /></Button>

          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              colorScheme="blue"
              leftIcon={<FiPlus />}
              rightIcon={<FiChevronDown />}
              ml={2}
            >
              New
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setAddingNew(true)}>New entry</MenuItem>
              <MenuItem>New template</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>

      <Box px={8}>
        <Table variant="simple" size="sm">
          <Thead bg={theadBg} borderBottom="1px solid" borderColor="gray.100">
            <Tr>
              <Th w="40px" p={0} borderBottom="1px solid" borderColor="gray.100"></Th>
              {propertyKeys.map((key) => (
                <Th key={key} textTransform="none" fontSize="13px" fontWeight="600" color={mutedColor} border="none" py={3}>
                  <HStack spacing={2}>
                    <Text>{key}</Text>
                    {schema[key].type === 'date' && <Icon as={FiCalendar} boxSize={3} />}
                    {schema[key].type === 'multi_select' && <Icon as={FiTag} boxSize={3} />}
                  </HStack>
                </Th>
              ))}
              <Th border="none" w="50px" p={0}>
                <Popover
                  isOpen={isAddingProp}
                  onClose={() => setIsAddingProp(false)}
                  placement="bottom-end"
                >
                  <PopoverTrigger>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setIsAddingProp(true)}
                      p={0}
                      minW="20px"
                      h="20px"
                      _hover={{ bg: 'gray.100' }}
                    >
                      <Icon as={FiPlus} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent w="250px">
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader fontSize="sm" fontWeight="600">Add new column</PopoverHeader>
                    <PopoverBody>
                      <VStack spacing={3}>
                        <Input
                          placeholder="Column name"
                          size="sm"
                          value={newPropName}
                          onChange={(e) => setNewPropName(e.target.value)}
                        />
                        <Select
                          size="sm"
                          value={newPropType}
                          onChange={(e) => setNewPropType(e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select</option>
                          <option value="multi_select">Multi-select</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="url">URL</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="relation">Relation</option>
                          <option value="rollup">Rollup</option>
                          <option value="formula">Formula</option>
                        </Select>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          w="full"
                          onClick={handleAddProperty}
                          isDisabled={!newPropName.trim()}
                        >
                          Add Column
                        </Button>
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {entries.length === 0 && !addingNew ? (
              <Tr>
                <Td colSpan={propertyKeys.length}>
                  <VStack py={8} spacing={3}>
                    <Text color={mutedColor}>No entries in this database</Text>
                    <Button
                      size="sm"
                      leftIcon={<Icon as={FiPlus} />}
                      onClick={() => setAddingNew(true)}
                      colorScheme="blue"
                      variant="outline"
                    >
                      Add first entry
                    </Button>
                  </VStack>
                </Td>
              </Tr>
            ) : (
              <>
                {entries.map((entry) => (
                  <Tr
                    key={entry.id}
                    _hover={{ bg: 'gray.50' }}
                    transition="background 0.1s"
                    role="group"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', entry.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData('text/plain');
                      if (draggedId === entry.id) return;

                      const newEntries = [...entries];
                      const draggedIndex = newEntries.findIndex(e => e.id === draggedId);
                      const targetIndex = newEntries.findIndex(e => e.id === entry.id);

                      if (draggedIndex > -1 && targetIndex > -1) {
                        const [draggedItem] = newEntries.splice(draggedIndex, 1);
                        newEntries.splice(targetIndex, 0, draggedItem);
                        setEntries(newEntries);
                        // TODO: Persist order to backend
                      }
                    }}
                    cursor="grab"
                  >
                    <Td w="40px" p={0} border="none">
                      <HStack spacing={0} opacity={0} _groupHover={{ opacity: 1 }} justify="center">
                        <Icon
                          as={FiMoreVertical}
                          color={mutedColor}
                          boxSize={4}
                          cursor="grab"
                          _active={{ cursor: 'grabbing' }}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔘 [NotionDatabaseTable] OPEN clicked for:', entry.id);
                            if (onPageClick) {
                              onPageClick(entry.id);
                            } else {
                              console.warn('⚠️ [NotionDatabaseTable] onPageClick is undefined');
                            }
                          }}
                          minW="24px"
                          h="24px"
                          color={mutedColor}
                          aria-label="Open page"
                          zIndex={2}
                        >
                          <Text fontSize="xs" fontWeight="600">OPEN</Text>
                        </Button>
                      </HStack>
                    </Td>
                    {propertyKeys.map((key) => (
                      <Td key={key} border="none" py={2}>
                        {renderPropertyValue(entry.properties?.[key], schema[key].type, entry.id, key)}
                      </Td>
                    ))}
                  </Tr>
                ))}
                {addingNew && (
                  <Tr bg={hoverBg}>
                    <Td>
                      <Input
                        placeholder="Enter title..."
                        size="sm"
                        value={newEntryTitle}
                        onChange={(e) => setNewEntryTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleAddEntry();
                          if (e.key === 'Escape') setAddingNew(false);
                        }}
                        autoFocus
                      />
                    </Td>
                    {propertyKeys.slice(1).map((key) => (
                      <Td key={key}>
                        <Text color={mutedColor} fontSize="sm">Empty</Text>
                      </Td>
                    ))}
                  </Tr>
                )}
              </>
            )}
          </Tbody>
        </Table>

        {!addingNew && entries.length > 0 && (
          <Button
            mt={2}
            size="sm"
            variant="ghost"
            leftIcon={<Icon as={FiPlus} />}
            onClick={() => setAddingNew(true)}
            color={mutedColor}
            _hover={{ bg: 'gray.50' }}
          >
            New
          </Button>
        )}
      </Box>
    </Box>
  );
}
