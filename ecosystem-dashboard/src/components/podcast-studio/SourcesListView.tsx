/**
 * SourcesListView - Reusable sources list component
 * Used in both AI Assistant activity panel and Podcast Studio script editor
 * Provides consistent UI for managing research materials
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Checkbox,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
} from '@chakra-ui/react';
import { FiPlus, FiFile, FiMoreVertical, FiTrash2, FiEdit, FiEye } from 'react-icons/fi';
import { ResearchMaterial } from '../../../pages/podcast-studio';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SourcesListViewProps {
  materials: ResearchMaterial[];
  selectedIds: string[];
  onToggleSource: (id: string) => void;
  onToggleAll: () => void;
  onAddSource: () => void;
  onDeleteSource?: (id: string) => void;
  onViewSource?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function SourcesListView({
  materials,
  selectedIds,
  onToggleSource,
  onToggleAll,
  onAddSource,
  onDeleteSource,
  onViewSource,
  showActions = true,
  compact = false,
}: SourcesListViewProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const linkColor = 'blue.500';

  const allSelected = materials.length > 0 && selectedIds.length === materials.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < materials.length;

  return (
    <VStack spacing={0} align="stretch" h="full">
      {/* Header with Add Button */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor}>
        <VStack spacing={3} align="stretch">
          <Button
            leftIcon={<FiPlus />}
            size="sm"
            w="full"
            onClick={onAddSource}
            colorScheme="blue"
            variant="solid"
          >
            Add Source
          </Button>
          
          {materials.length > 0 && (
            <HStack justify="space-between">
              <Text
                fontSize="xs"
                color={linkColor}
                cursor="pointer"
                onClick={onToggleAll}
                _hover={{ textDecoration: 'underline' }}
              >
                {allSelected ? 'deselect all' : 'select all sources'}
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                {selectedIds.length} of {materials.length} selected
              </Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Sources List */}
      <Box flex="1" overflowY="auto">
        {materials.length === 0 ? (
          <Box p={8} textAlign="center">
            <Icon as={FiFile} boxSize={12} color={mutedColor} mb={3} />
            <Text fontSize="sm" color={mutedColor} mb={4}>
              No source materials yet
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              Add research materials to start generating podcast scripts
            </Text>
          </Box>
        ) : (
          <VStack spacing={0} align="stretch" p={2}>
            {materials.map((material) => {
              const isSelected = selectedIds.includes(material.id);
              return (
                <HStack
                  key={material.id}
                  p={3}
                  spacing={3}
                  bg={isSelected ? selectedBg : 'transparent'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => onToggleSource(material.id)}
                  _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                  transition="all 0.2s"
                  borderBottom="1px solid"
                  borderColor={borderColor}
                >
                  {/* File Icon */}
                  <Icon 
                    as={FiFile} 
                    color={isSelected ? 'blue.500' : mutedColor} 
                    boxSize={4}
                    flexShrink={0}
                  />
                  
                  {/* Content */}
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text 
                      fontSize="sm" 
                      fontWeight="500" 
                      color={textColor}
                      noOfLines={compact ? 1 : 2}
                    >
                      {material.title}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      {material.wordCount?.toLocaleString() || material.word_count?.toLocaleString() || 0} words
                      {material.pageCount && ` • ${material.pageCount} pages`}
                    </Text>
                  </VStack>

                  {/* Actions */}
                  <HStack spacing={1} flexShrink={0}>
                    {showActions && (
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          size="xs"
                          variant="ghost"
                          aria-label="More options"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList>
                          {onViewSource && (
                            <MenuItem 
                              icon={<FiEye />} 
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewSource(material.id);
                              }}
                            >
                              View Details
                            </MenuItem>
                          )}
                          {onDeleteSource && (
                            <MenuItem 
                              icon={<FiTrash2 />} 
                              color="red.500"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSource(material.id);
                              }}
                            >
                              Delete
                            </MenuItem>
                          )}
                        </MenuList>
                      </Menu>
                    )}
                    <Checkbox
                      isChecked={isSelected}
                      colorScheme="blue"
                      size="md"
                      pointerEvents="none"
                    />
                  </HStack>
                </HStack>
              );
            })}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
