/**
 * DatabaseViewSettings - Right panel for database view customization
 * Mimics Notion's view settings sidebar
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  IconButton,
  Switch,
  Select,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  ViewIcon,
  AddIcon,
  DeleteIcon,
  DragHandleIcon,
  ChevronDownIcon,
  SettingsIcon,
} from '@chakra-ui/icons';
import { Database, DatabaseView } from '../../types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DatabaseViewSettingsProps {
  database: Database;
  activeView: DatabaseView;
  onUpdateView: (view: DatabaseView) => void;
  onAddView: (type: string) => void;
  onChangeView: (viewId: string) => void;
}

export function DatabaseViewSettings({
  database,
  activeView,
  onUpdateView,
  onAddView,
  onChangeView,
}: DatabaseViewSettingsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const viewIcons: Record<string, string> = {
    table: '📊',
    gallery: '🎨',
    board: '📋',
    list: '📝',
    calendar: '📅',
    timeline: '📈',
  };

  return (
    <VStack
      spacing={0}
      align="stretch"
      h="100%"
      bg={bgColor}
      borderLeftWidth="1px"
      borderColor={borderColor}
    >
      {/* Header */}
      <HStack p={4} borderBottomWidth="1px" borderColor={borderColor}>
        <ViewIcon />
        <Text fontWeight="bold" fontSize="sm">
          View Settings
        </Text>
      </HStack>

      {/* Scrollable Content */}
      <VStack spacing={0} align="stretch" overflowY="auto" flex={1}>
        <Accordion allowMultiple defaultIndex={[0, 1, 2]}>
          {/* Layout Section */}
          <AccordionItem border="none">
            <AccordionButton py={3} _hover={{ bg: hoverBg }}>
              <HStack flex={1} spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Layout
                </Text>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={2} align="stretch">
                <Menu>
                  <MenuButton
                    as={Button}
                    size="sm"
                    rightIcon={<ChevronDownIcon />}
                    width="full"
                    justifyContent="space-between"
                  >
                    <HStack spacing={2}>
                      <Text>{viewIcons[activeView.type]}</Text>
                      <Text textTransform="capitalize">{activeView.type}</Text>
                    </HStack>
                  </MenuButton>
                  <MenuList>
                    {database.views?.map((view) => (
                      <MenuItem
                        key={view.id}
                        onClick={() => onChangeView(view.id)}
                        bg={view.id === activeView.id ? 'blue.50' : undefined}
                      >
                        <HStack spacing={2}>
                          <Text>{viewIcons[view.type]}</Text>
                          <Text>{view.name}</Text>
                        </HStack>
                      </MenuItem>
                    ))}
                    <Divider my={2} />
                    <MenuItem onClick={() => onAddView('table')}>
                      <HStack spacing={2}>
                        <AddIcon boxSize={3} />
                        <Text>Add Table View</Text>
                      </HStack>
                    </MenuItem>
                    <MenuItem onClick={() => onAddView('gallery')}>
                      <HStack spacing={2}>
                        <AddIcon boxSize={3} />
                        <Text>Add Gallery View</Text>
                      </HStack>
                    </MenuItem>
                    <MenuItem onClick={() => onAddView('board')}>
                      <HStack spacing={2}>
                        <AddIcon boxSize={3} />
                        <Text>Add Board View</Text>
                      </HStack>
                    </MenuItem>
                  </MenuList>
                </Menu>

                {/* View Name */}
                <Input
                  size="sm"
                  placeholder="View name"
                  value={activeView.name}
                  onChange={(e) =>
                    onUpdateView({ ...activeView, name: e.target.value })
                  }
                />
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          {/* Properties Section */}
          <AccordionItem border="none">
            <AccordionButton py={3} _hover={{ bg: hoverBg }}>
              <HStack flex={1} spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Properties
                </Text>
                <Badge colorScheme="blue" fontSize="xs">
                  {database.schema.length}
                </Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={2} align="stretch">
                {database.schema.map((property) => (
                  <HStack
                    key={property.id}
                    spacing={2}
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                  >
                    <DragHandleIcon boxSize={3} color={useSemanticToken('text.tertiary')} />
                    <Text fontSize="sm" flex={1}>
                      {property.name}
                    </Text>
                    <Badge
                      colorScheme="purple"
                      fontSize="xs"
                      textTransform="none"
                    >
                      {property.type}
                    </Badge>
                    <Switch size="sm" defaultChecked />
                  </HStack>
                ))}

                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<AddIcon />}
                  justifyContent="flex-start"
                  width="full"
                >
                  Add property
                </Button>
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          {/* Filter Section */}
          <AccordionItem border="none">
            <AccordionButton py={3} _hover={{ bg: hoverBg }}>
              <HStack flex={1} spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Filter
                </Text>
                {activeView.filter && (
                  <Badge colorScheme="green" fontSize="xs">
                    Active
                  </Badge>
                )}
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {activeView.filter ? (
                  <>
                    {/* Existing filters */}
                    <HStack spacing={2}>
                      <Select size="sm" placeholder="Property">
                        {database.schema.map((prop) => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name}
                          </option>
                        ))}
                      </Select>
                      <Select size="sm" placeholder="Condition">
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not equals</option>
                        <option value="contains">Contains</option>
                        <option value="is_empty">Is empty</option>
                        <option value="is_not_empty">Is not empty</option>
                      </Select>
                    </HStack>
                    <Input size="sm" placeholder="Value" />
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<AddIcon />}
                    onClick={() => setFilterOpen(true)}
                    width="full"
                    justifyContent="flex-start"
                  >
                    Add filter
                  </Button>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          {/* Sort Section */}
          <AccordionItem border="none">
            <AccordionButton py={3} _hover={{ bg: hoverBg }}>
              <HStack flex={1} spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Sort
                </Text>
                {activeView.sort && (
                  <Badge colorScheme="orange" fontSize="xs">
                    {activeView.sort.length}
                  </Badge>
                )}
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack spacing={3} align="stretch">
                {activeView.sort && activeView.sort.length > 0 ? (
                  <>
                    {activeView.sort.map((sort, index) => (
                      <HStack key={index} spacing={2}>
                        <Select size="sm" value={sort.property}>
                          {database.schema.map((prop) => (
                            <option key={prop.id} value={prop.id}>
                              {prop.name}
                            </option>
                          ))}
                        </Select>
                        <Select size="sm" value={sort.direction}>
                          <option value="asc">↑ Ascending</option>
                          <option value="desc">↓ Descending</option>
                        </Select>
                        <IconButton
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          aria-label="Remove sort"
                        />
                      </HStack>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<AddIcon />}
                      width="full"
                      justifyContent="flex-start"
                    >
                      Add sort
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<AddIcon />}
                    width="full"
                    justifyContent="flex-start"
                  >
                    Add sort
                  </Button>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          {/* Group Section (for Board view) */}
          {activeView.type === 'board' && (
            <AccordionItem border="none">
              <AccordionButton py={3} _hover={{ bg: hoverBg }}>
                <HStack flex={1} spacing={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Group by
                  </Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <Select size="sm" placeholder="Select property">
                  {database.schema
                    .filter(
                      (p) => p.type === 'select' || p.type === 'multi_select'
                    )
                    .map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                </Select>
              </AccordionPanel>
            </AccordionItem>
          )}

          {/* Gallery Settings */}
          {activeView.type === 'gallery' && (
            <AccordionItem border="none">
              <AccordionButton py={3} _hover={{ bg: hoverBg }}>
                <HStack flex={1} spacing={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Card size
                  </Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <VStack spacing={2} align="stretch">
                  <Select size="sm" defaultValue="medium">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </Select>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Show properties</Text>
                    <Switch size="sm" defaultChecked />
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Fit image</Text>
                    <Switch size="sm" defaultChecked />
                  </HStack>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          )}
        </Accordion>
      </VStack>

      {/* Footer Actions */}
      <VStack
        spacing={2}
        p={4}
        borderTopWidth="1px"
        borderColor={borderColor}
        align="stretch"
      >
        <Button size="sm" variant="ghost" leftIcon={<SettingsIcon />}>
          Advanced settings
        </Button>
        <Button size="sm" colorScheme="red" variant="ghost">
          Delete view
        </Button>
      </VStack>
    </VStack>
  );
}

export default DatabaseViewSettings;
