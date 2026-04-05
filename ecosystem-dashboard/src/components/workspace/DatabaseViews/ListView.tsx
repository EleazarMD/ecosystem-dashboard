/**
 * ListView - Simple list view for databases
 * Minimal, clean layout focused on titles and key properties
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Checkbox,
  IconButton,
  Divider,
  Button,
  Icon,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { FiPlus } from 'react-icons/fi';
import { Database, Block, DatabaseView } from '../../../types/workspace';
import { PropertyCommandMenu } from '../PropertyCommandMenu';
import { useAddPropertyButton } from '../../../hooks/usePropertyCommand';
import { PropertyDefinition, PropertyType } from '../../../lib/property-registry';
import { PropertyRow } from '../PropertyField';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ListViewProps {
  database: Database;
  pages: Block[];
  view: DatabaseView;
  onUpdate: () => void;
}

interface ListProperty {
  id: string;
  name: string;
  type: PropertyType;
  icon: string;
  value?: any;
  options?: Array<{ value: string; label: string; color?: string }>;
}

export function ListView({ database, pages, view, onUpdate }: ListViewProps) {
  const router = useRouter();
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [propertyValues, setPropertyValues] = useState<Map<string, Map<string, any>>>(new Map());
  const [visibleProperties, setVisibleProperties] = useState<ListProperty[]>([]);

  const bgColor = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');
  
  // Property system integration
  const addProperty = useAddPropertyButton(
    (property: PropertyDefinition) => {
      const newProperty: ListProperty = {
        id: `prop-${Date.now()}`,
        name: property.name,
        type: property.type,
        icon: property.icon,
        options: property.config?.hasOptions ? [] : undefined,
      };
      setVisibleProperties([...visibleProperties, newProperty]);
    },
    {
      view: 'list',
      hasDatabase: true,
    }
  );

  useEffect(() => {
    loadPropertyValues();
  }, [pages]);

  const loadPropertyValues = async () => {
    const valuesMap = new Map<string, Map<string, any>>();
    
    for (const page of pages) {
      try {
        const response = await fetch(`/api/database/property-values/${page.id}`);
        if (response.ok) {
          const data = await response.json();
          valuesMap.set(page.id, new Map(Object.entries(data.values)));
        }
      } catch (error) {
        console.error(`Error loading values for page ${page.id}:`, error);
      }
    }

    setPropertyValues(valuesMap);
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

  const getPageTitle = (page: Block): string => {
    if (page.properties?.title && Array.isArray(page.properties.title)) {
      return page.properties.title.map(rt => rt.text?.content || '').join('') || 'Untitled';
    }
    return 'Untitled';
  };

  const getPropertyValue = (pageId: string, propId: string): any => {
    return propertyValues.get(pageId)?.get(propId) || null;
  };

  // Show up to 3 key properties in list view (from database schema)
  const defaultSchemaProperties = database.schema
    .filter(p => p.type !== 'title')
    .slice(0, 3);
  
  // Combine with dynamic properties
  const allVisibleProperties = visibleProperties.length > 0 
    ? visibleProperties 
    : defaultSchemaProperties;

  return (
    <>
      {/* Properties Header */}
      <HStack justify="space-between" mb={4} pb={3} borderBottom="1px solid" borderColor={borderColor}>
        <HStack spacing={4}>
          <Text fontSize="sm" fontWeight="600" color={useSemanticToken('text.secondary')}>
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
      
      <VStack spacing={0} align="stretch" bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        {pages.length === 0 ? (
          <Box p={12} textAlign="center">
            <Text fontSize="4xl" mb={2}>📝</Text>
            <Text fontWeight="bold" mb={2}>No pages yet</Text>
            <Text color={useSemanticToken('text.secondary')}>
              Add your first page to this database
            </Text>
          </Box>
        ) : (
        pages.map((page, index) => {
          const title = getPageTitle(page);
          const isSelected = selectedPages.has(page.id);

          return (
            <React.Fragment key={page.id}>
              <HStack
                spacing={3}
                p={4}
                cursor="pointer"
                bg={isSelected ? 'blue.50' : undefined}
                _hover={{ bg: hoverBg }}
                transition="all 0.2s"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    togglePageSelection(page.id);
                  } else {
                    router.push(`/workspace?page=${page.id}`, undefined, { shallow: true });
                  }
                }}
              >
                {/* Selection Checkbox */}
                <Checkbox
                  isChecked={isSelected}
                  onChange={() => togglePageSelection(page.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Icon */}
                <Text fontSize="lg">📄</Text>

                {/* Content */}
                <VStack flex={1} align="stretch" spacing={1}>
                  {/* Title */}
                  <Text fontWeight="medium" fontSize="md" noOfLines={1}>
                    {title}
                  </Text>

                  {/* Dynamic Properties */}
                  {visibleProperties.length > 0 && (
                    <VStack align="stretch" spacing={1} fontSize="sm">
                      {visibleProperties.map((prop) => (
                        <PropertyRow
                          key={prop.id}
                          propertyName={prop.name}
                          propertyType={prop.type}
                          propertyIcon={prop.icon}
                          value={prop.value}
                          onChange={(value) => {
                            // Update property value (future implementation)
                            console.log('Update property:', prop.id, value);
                          }}
                          options={prop.options}
                        />
                      ))}
                    </VStack>
                  )}
                  
                  {/* Schema Properties (fallback) */}
                  {visibleProperties.length === 0 && defaultSchemaProperties.length > 0 && (
                    <HStack spacing={3} fontSize="sm">
                      {defaultSchemaProperties.map((prop) => {
                        const value = getPropertyValue(page.id, prop.id);
                        if (!value) return null;

                        return (
                          <HStack key={prop.id} spacing={1}>
                            <Text color={useSemanticToken('text.secondary')}>{prop.name}:</Text>
                            {renderPropertyValue(prop, value)}
                          </HStack>
                        );
                      })}
                    </HStack>
                  )}

                  {/* Metadata */}
                  <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                    Updated {new Date(page.updated_at).toLocaleDateString()}
                  </Text>
                </VStack>

                {/* Arrow */}
                <IconButton
                  icon={<ChevronRightIcon />}
                  size="sm"
                  variant="ghost"
                  aria-label="Open"
                />
              </HStack>

              {index < pages.length - 1 && <Divider />}
            </React.Fragment>
          );
        })
      )}
    </VStack>
      
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

function renderPropertyValue(prop: any, value: any) {
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
    case 'number':
      return <Text fontSize="xs">{value}</Text>;
    default:
      return <Text fontSize="xs" noOfLines={1}>{String(value)}</Text>;
  }
}

export default ListView;
