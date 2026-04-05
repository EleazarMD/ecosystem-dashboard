/**
 * Gallery View - Card-based visual layout for databases
 * Similar to Notion's gallery view with image covers and properties
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  SimpleGrid,
  VStack,
  HStack,
  Text,
  Image,
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Checkbox,
} from '@chakra-ui/react';
import { ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';
import { Database, Block, DatabaseView } from '../../../types/workspace';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GalleryViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

export function GalleryView({ database, pages, view, onUpdate }: GalleryViewProps) {
  const router = useRouter();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showProperties, setShowProperties] = useState(true);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const getCardWidth = () => {
    switch (cardSize) {
      case 'small': return '200px';
      case 'medium': return '260px';
      case 'large': return '320px';
      default: return '260px';
    }
  };

  const togglePageSelection = (pageId: string) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedPages(newSelection);
  };

  const getPropertyValue = (page: Block, propertyName: string) => {
    // TODO: Fetch from database_property_values table
    return null;
  };

  const getCoverImage = (page: Block): string | null => {
    // Check for cover property
    const coverProp = database.schema.find(p => p.name.toLowerCase() === 'cover' || p.type === 'files');
    if (coverProp) {
      const value = getPropertyValue(page, coverProp.name);
      if (value && Array.isArray(value) && value.length > 0) {
        return value[0].url || null;
      }
    }
    return null;
  };

  const getPageTitle = (page: Block): string => {
    if (page.properties?.title && Array.isArray(page.properties.title)) {
      return page.properties.title.map(rt => rt.text?.content || '').join('') || 'Untitled';
    }
    return 'Untitled';
  };

  const visibleProperties = database.schema
    .filter(prop => prop.type !== 'title' && prop.name.toLowerCase() !== 'cover')
    .slice(0, 3); // Show max 3 properties in cards

  return (
    <VStack spacing={4} align="stretch">
      {/* Toolbar */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          {selectedPages.size > 0 && (
            <>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                {selectedPages.size} selected
              </Text>
              <Button size="sm" variant="outline">
                Delete
              </Button>
              <Button size="sm" variant="outline">
                Duplicate
              </Button>
            </>
          )}
        </HStack>

        <HStack spacing={2}>
          <Menu>
            <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />}>
              Card Size
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => setCardSize('small')}>
                Small
              </MenuItem>
              <MenuItem onClick={() => setCardSize('medium')}>
                Medium
              </MenuItem>
              <MenuItem onClick={() => setCardSize('large')}>
                Large
              </MenuItem>
            </MenuList>
          </Menu>

          <IconButton
            icon={<SettingsIcon />}
            size="sm"
            variant="ghost"
            aria-label="View settings"
            onClick={() => setShowProperties(!showProperties)}
          />
        </HStack>
      </HStack>

      {/* Gallery Grid */}
      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
        spacing={4}
        minChildWidth={getCardWidth()}
      >
        {pages.map((page) => {
          const coverImage = getCoverImage(page);
          const title = getPageTitle(page);
          const isSelected = selectedPages.has(page.id);

          return (
            <Box
              key={page.id}
              bg={bgColor}
              borderWidth="1px"
              borderColor={isSelected ? 'blue.500' : borderColor}
              borderRadius="lg"
              overflow="hidden"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                bg: hoverBg,
                transform: 'translateY(-2px)',
                shadow: 'md'
              }}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                  togglePageSelection(page.id);
                } else {
                  // Open page
                  router.push(`/workspace?page=${page.id}`, undefined, { shallow: true });
                }
              }}
            >
              {/* Cover Image */}
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={title}
                  w="100%"
                  h="160px"
                  objectFit="cover"
                />
              ) : (
                <Box
                  w="100%"
                  h="160px"
                  bg="gradient.linear(to-br, blue.400, purple.500)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="4xl">📄</Text>
                </Box>
              )}

              {/* Card Content */}
              <VStack spacing={2} p={4} align="stretch">
                {/* Selection Checkbox */}
                <HStack justify="space-between">
                  <Checkbox
                    isChecked={isSelected}
                    onChange={() => togglePageSelection(page.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {new Date(page.updated_at).toLocaleDateString()}
                  </Text>
                </HStack>

                {/* Title */}
                <Text fontWeight="bold" noOfLines={2} fontSize="md">
                  {title}
                </Text>

                {/* Properties */}
                {showProperties && visibleProperties.length > 0 && (
                  <VStack spacing={1} align="stretch" pt={2}>
                    {visibleProperties.map((prop) => {
                      const value = getPropertyValue(page, prop.name);
                      return (
                        <HStack key={prop.id} spacing={2} fontSize="sm">
                          <Text color={useSemanticToken('text.secondary')} fontSize="xs" minW="60px">
                            {prop.name}:
                          </Text>
                          {renderPropertyValue(prop, value)}
                        </HStack>
                      );
                    })}
                  </VStack>
                )}
              </VStack>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Empty State */}
      {pages.length === 0 && (
        <Box
          p={12}
          textAlign="center"
          borderWidth="2px"
          borderStyle="dashed"
          borderRadius="lg"
          borderColor={useSemanticToken('border.default')}
        >
          <Text fontSize="4xl" mb={2}>🖼️</Text>
          <Text fontWeight="bold" mb={2}>No pages yet</Text>
          <Text color={useSemanticToken('text.secondary')} mb={4}>
            Create your first page to see it in gallery view
          </Text>
          <Button colorScheme="blue" size="sm">
            Create Page
          </Button>
        </Box>
      )}
    </VStack>
  );
}

function renderPropertyValue(prop: any, value: any) {
  if (!value) {
    return <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>Empty</Text>;
  }

  switch (prop.type) {
    case 'select':
      return (
        <Badge colorScheme="blue" fontSize="xs">
          {value}
        </Badge>
      );
    case 'multi_select':
      return (
        <HStack spacing={1}>
          {value.slice(0, 2).map((v: string, i: number) => (
            <Badge key={i} colorScheme="purple" fontSize="xs">
              {v}
            </Badge>
          ))}
          {value.length > 2 && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>+{value.length - 2}</Text>
          )}
        </HStack>
      );
    case 'checkbox':
      return <Text fontSize="xs">{value ? '✅' : '☐'}</Text>;
    case 'date':
      return <Text fontSize="xs">{new Date(value).toLocaleDateString()}</Text>;
    default:
      return <Text fontSize="xs" noOfLines={1}>{String(value)}</Text>;
  }
}

export default GalleryView;
