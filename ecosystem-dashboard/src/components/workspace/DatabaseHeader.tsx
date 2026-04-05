/**
 * DatabaseHeader - Enhanced database header with inline controls
 * Notion-style title editing, view switcher, and action buttons
 */

import React, { useState } from 'react';
import {
  HStack,
  VStack,
  Box,
  Text,
  Input,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Editable,
  EditableInput,
  EditablePreview,
  Tooltip,
} from '@chakra-ui/react';
import {
  AddIcon,
  SettingsIcon,
  ChevronDownIcon,
  StarIcon,
  LinkIcon,
  DownloadIcon,
} from '@chakra-ui/icons';
import { Database, DatabaseView } from '../../types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DatabaseHeaderProps {
  database: Database;
  activeView: DatabaseView;
  onUpdateTitle: (title: string) => void;
  onAddView: (type: string) => void;
  onCreatePage: () => void;
  onToggleSettings: () => void;
}

export function DatabaseHeader({
  database,
  activeView,
  onUpdateTitle,
  onAddView,
  onCreatePage,
  onToggleSettings,
}: DatabaseHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const iconColor = useSemanticToken('text.secondary');

  const viewIcons: Record<string, string> = {
    table: '📊',
    gallery: '🎨',
    board: '📋',
    list: '📝',
    calendar: '📅',
    timeline: '📈',
  };

  const getTitle = () => {
    if (database.title && Array.isArray(database.title)) {
      return database.title.map(rt => rt.text?.content || '').join('') || 'Untitled';
    }
    return 'Untitled';
  };

  return (
    <VStack
      spacing={4}
      align="stretch"
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      p={6}
      pt={8}
    >
      {/* Title Row */}
      <HStack spacing={3} align="center">
        {/* Icon */}
        <Box fontSize="3xl" cursor="pointer">
          📊
        </Box>

        {/* Editable Title */}
        <Editable
          value={getTitle()}
          fontSize="2xl"
          fontWeight="bold"
          flex={1}
          onSubmit={onUpdateTitle}
        >
          <EditablePreview />
          <EditableInput />
        </Editable>

        {/* Action Buttons */}
        <HStack spacing={2}>
          <Tooltip label="Add to favorites">
            <IconButton
              icon={<StarIcon />}
              size="sm"
              variant="ghost"
              aria-label="Favorite"
              color={iconColor}
            />
          </Tooltip>

          <Tooltip label="Copy link">
            <IconButton
              icon={<LinkIcon />}
              size="sm"
              variant="ghost"
              aria-label="Copy link"
              color={iconColor}
            />
          </Tooltip>

          <Menu>
            <MenuButton
              as={IconButton}
              icon={<SettingsIcon />}
              size="sm"
              variant="ghost"
              aria-label="Settings"
              color={iconColor}
            />
            <MenuList>
              <MenuItem>Rename</MenuItem>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem>Export</MenuItem>
              <MenuItem>Move to</MenuItem>
              <MenuItem color="red.500">Delete</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>

      {/* Controls Row */}
      <HStack spacing={3} justify="space-between">
        {/* View Selector */}
        <HStack spacing={2}>
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              leftIcon={<Text>{viewIcons[activeView.type]}</Text>}
              rightIcon={<ChevronDownIcon />}
              variant="outline"
            >
              {activeView.name}
            </MenuButton>
            <MenuList>
              {/* Existing Views */}
              <Box px={3} py={2}>
                <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} mb={2}>
                  VIEWS
                </Text>
              </Box>
              {database.views?.map((view) => (
                <MenuItem key={view.id}>
                  <HStack spacing={2}>
                    <Text>{viewIcons[view.type]}</Text>
                    <Text>{view.name}</Text>
                    {view.id === activeView.id && (
                      <Badge colorScheme="blue" ml="auto">
                        Active
                      </Badge>
                    )}
                  </HStack>
                </MenuItem>
              ))}

              {/* Add New View */}
              <Box px={3} py={2} mt={2} borderTopWidth="1px">
                <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} mb={2}>
                  ADD VIEW
                </Text>
              </Box>
              <MenuItem onClick={() => onAddView('table')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>Table</Text>
                </HStack>
              </MenuItem>
              <MenuItem onClick={() => onAddView('gallery')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>Gallery</Text>
                </HStack>
              </MenuItem>
              <MenuItem onClick={() => onAddView('board')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>Board</Text>
                </HStack>
              </MenuItem>
              <MenuItem onClick={() => onAddView('list')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>List</Text>
                </HStack>
              </MenuItem>
              <MenuItem onClick={() => onAddView('calendar')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>Calendar</Text>
                </HStack>
              </MenuItem>
              <MenuItem onClick={() => onAddView('timeline')}>
                <HStack spacing={2}>
                  <AddIcon boxSize={3} />
                  <Text>Timeline</Text>
                </HStack>
              </MenuItem>
            </MenuList>
          </Menu>

          {/* Filter/Sort Indicators */}
          {activeView.filter && (
            <Badge colorScheme="green" fontSize="xs">
              Filtered
            </Badge>
          )}
          {activeView.sort && activeView.sort.length > 0 && (
            <Badge colorScheme="orange" fontSize="xs">
              Sorted
            </Badge>
          )}
        </HStack>

        {/* Right Actions */}
        <HStack spacing={2}>
          <Button
            size="sm"
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onCreatePage}
          >
            New
          </Button>

          <Menu>
            <MenuButton
              as={IconButton}
              icon={<ChevronDownIcon />}
              size="sm"
              variant="outline"
              aria-label="More"
            />
            <MenuList>
              <MenuItem icon={<AddIcon />}>New page</MenuItem>
              <MenuItem icon={<DownloadIcon />}>Import</MenuItem>
              <MenuItem icon={<DownloadIcon />}>Export</MenuItem>
              <MenuItem onClick={onToggleSettings}>
                <HStack spacing={2}>
                  <SettingsIcon />
                  <Text>View settings</Text>
                </HStack>
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>

      {/* Description (if exists) */}
      {database.description && (
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          {typeof database.description === 'string' 
            ? database.description 
            : Array.isArray(database.description)
            ? database.description.map(rt => rt.text?.content || '').join('')
            : ''}
        </Text>
      )}

      {/* Stats */}
      <HStack spacing={4} fontSize="sm" color={useSemanticToken('text.secondary')}>
        <Text>
          {database.schema.length} {database.schema.length === 1 ? 'property' : 'properties'}
        </Text>
        <Text>•</Text>
        <Text>
          {database.views?.length || 0} {database.views?.length === 1 ? 'view' : 'views'}
        </Text>
        <Text>•</Text>
        <Text>Last edited {new Date(database.updated_at).toLocaleDateString()}</Text>
      </HStack>
    </VStack>
  );
}

export default DatabaseHeader;
