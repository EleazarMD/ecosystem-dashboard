/**
 * PropertyValueEditor - Universal property value editor
 * Renders appropriate input based on property type
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Input,
  Checkbox,
  Select as ChakraSelect,
  HStack,
  VStack,
  Text,
  IconButton,
  Icon,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Portal,
} from '@chakra-ui/react';
import { FiX, FiPlus, FiCalendar, FiUser, FiChevronDown } from 'react-icons/fi';
import { PropertyType } from '@/lib/property-registry';
import { PersonPicker } from './PersonPicker';
import { PersonPropertyDisplay } from './PersonPropertyDisplay';
import { RelationPicker } from './RelationPicker';
import { RelationPropertyDisplay } from './RelationPropertyDisplay';
import { PlacePicker } from './PlacePicker';
import { PlacePropertyDisplay } from './PlacePropertyDisplay';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PropertyValueEditorProps {
  propertyType: PropertyType;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  options?: Array<{ value: string; label: string; color?: string }>;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  workspaceId?: string; // Required for person pickers
  databaseId?: string; // Required for relation pickers
}

export function PropertyValueEditor({
  propertyType,
  value,
  onChange,
  placeholder = 'Empty',
  options = [],
  readOnly = false,
  size = 'sm',
  workspaceId,
  databaseId,
}: PropertyValueEditorProps) {
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  
  // TEXT PROPERTY
  if (propertyType === 'text') {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // NUMBER PROPERTY
  if (propertyType === 'number') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // CHECKBOX PROPERTY
  if (propertyType === 'checkbox') {
    return (
      <Checkbox
        isChecked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        size={size}
        isReadOnly={readOnly}
      >
        <Text fontSize="sm" color={mutedColor}>
          {value ? 'Checked' : 'Unchecked'}
        </Text>
      </Checkbox>
    );
  }
  
  // URL PROPERTY
  if (propertyType === 'url') {
    return (
      <Input
        type="url"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'https://example.com'}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // EMAIL PROPERTY
  if (propertyType === 'email') {
    return (
      <Input
        type="email"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'email@example.com'}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // PHONE PROPERTY
  if (propertyType === 'phone') {
    return (
      <Input
        type="tel"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '+1 (555) 123-4567'}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // SELECT PROPERTY
  if (propertyType === 'select') {
    if (options.length === 0) {
      return (
        <Text fontSize="sm" color={mutedColor}>
          {placeholder}
        </Text>
      );
    }
    
    return (
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<Icon as={FiChevronDown} />}
          size={size}
          variant="outline"
          textAlign="left"
          isDisabled={readOnly}
        >
          {value ? (
            <Badge
              colorScheme={
                options.find(o => o.value === value)?.color || 'gray'
              }
            >
              {options.find(o => o.value === value)?.label || value}
            </Badge>
          ) : (
            <Text color={mutedColor}>{placeholder}</Text>
          )}
        </MenuButton>
        <Portal>
          <MenuList>
            {options.map(option => (
              <MenuItem
                key={option.value}
                onClick={() => onChange(option.value)}
              >
                <Badge colorScheme={option.color || 'gray'}>
                  {option.label}
                </Badge>
              </MenuItem>
            ))}
            {value && (
              <>
                <MenuItem onClick={() => onChange(null)}>
                  <Text color={mutedColor}>Clear selection</Text>
                </MenuItem>
              </>
            )}
          </MenuList>
        </Portal>
      </Menu>
    );
  }
  
  // MULTI-SELECT PROPERTY
  if (propertyType === 'multi_select') {
    const selectedValues = Array.isArray(value) ? value : [];
    
    if (options.length === 0) {
      return (
        <Text fontSize="sm" color={mutedColor}>
          {placeholder}
        </Text>
      );
    }
    
    const toggleValue = (optionValue: string) => {
      if (selectedValues.includes(optionValue)) {
        onChange(selectedValues.filter(v => v !== optionValue));
      } else {
        onChange([...selectedValues, optionValue]);
      }
    };
    
    return (
      <VStack align="stretch" spacing={1}>
        {selectedValues.length > 0 ? (
          <HStack spacing={1} flexWrap="wrap">
            {selectedValues.map(val => {
              const option = options.find(o => o.value === val);
              return (
                <Badge
                  key={val}
                  colorScheme={option?.color || 'gray'}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  {option?.label || val}
                  {!readOnly && (
                    <Icon
                      as={FiX}
                      boxSize={3}
                      cursor="pointer"
                      onClick={() => toggleValue(val)}
                    />
                  )}
                </Badge>
              );
            })}
          </HStack>
        ) : (
          <Text fontSize="sm" color={mutedColor}>{placeholder}</Text>
        )}
        
        {!readOnly && (
          <Menu>
            <MenuButton
              as={Button}
              size="xs"
              variant="ghost"
              leftIcon={<Icon as={FiPlus} />}
            >
              Add option
            </MenuButton>
            <Portal>
              <MenuList>
                {options
                  .filter(opt => !selectedValues.includes(opt.value))
                  .map(option => (
                    <MenuItem
                      key={option.value}
                      onClick={() => toggleValue(option.value)}
                    >
                      <Badge colorScheme={option.color || 'gray'}>
                        {option.label}
                      </Badge>
                    </MenuItem>
                  ))}
              </MenuList>
            </Portal>
          </Menu>
        )}
      </VStack>
    );
  }
  
  // DATE PROPERTY
  if (propertyType === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        size={size}
        isReadOnly={readOnly}
      />
    );
  }
  
  // PERSON PROPERTY
  if (propertyType === 'person') {
    if (!workspaceId) {
      return <Text color={mutedColor} fontSize="13px">No workspace ID</Text>;
    }
    
    return (
      <Box>
        <PersonPropertyDisplay
          value={value}
          variant="compact"
          size="sm"
          onClick={readOnly ? undefined : () => setShowPersonPicker(true)}
        />
        {showPersonPicker && !readOnly && (
          <PersonPicker
            workspaceId={workspaceId}
            value={value}
            onChange={(selectedUser) => {
              onChange(selectedUser);
              setShowPersonPicker(false);
            }}
            onClose={() => setShowPersonPicker(false)}
            placeholder="Search people..."
          />
        )}
      </Box>
    );
  }
  
  // PEOPLE PROPERTY (multiple)
  if (propertyType === 'people') {
    if (!workspaceId) {
      return <Text color={mutedColor} fontSize="13px">No workspace ID</Text>;
    }
    
    return (
      <Box>
        <PersonPropertyDisplay
          value={value}
          variant="compact"
          size="sm"
          onClick={readOnly ? undefined : () => setShowPersonPicker(true)}
        />
        {showPersonPicker && !readOnly && (
          <PersonPicker
            workspaceId={workspaceId}
            value={value}
            onChange={(selectedUsers) => {
              onChange(selectedUsers);
            }}
            onClose={() => setShowPersonPicker(false)}
            multiple={true}
            placeholder="Search people..."
          />
        )}
      </Box>
    );
  }
  
  // PLACE PROPERTY
  if (propertyType === 'place') {
    return (
      <Box>
        <PlacePropertyDisplay
          value={value}
          variant="compact"
          onClick={readOnly ? undefined : () => setShowPlacePicker(true)}
        />
        {showPlacePicker && !readOnly && (
          <PlacePicker
            value={value}
            onChange={(selectedPlace) => {
              onChange(selectedPlace);
              setShowPlacePicker(false);
            }}
            onClose={() => setShowPlacePicker(false)}
            useGoogle={!!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
            placeholder="Search for a location..."
          />
        )}
      </Box>
    );
  }
  
  // FILES PROPERTY
  if (propertyType === 'files') {
    return (
      <Input
        type="file"
        multiple
        size={size}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onChange(files);
        }}
        isReadOnly={readOnly}
      />
    );
  }
  
  // READ-ONLY PROPERTIES (Formula, Created time, etc.)
  if (
    propertyType === 'formula' ||
    propertyType === 'created_time' ||
    propertyType === 'created_by' ||
    propertyType === 'last_edited_time' ||
    propertyType === 'last_edited_by'
  ) {
    const displayValue = 
      propertyType.includes('time') && value
        ? new Date(value).toLocaleString()
        : value || placeholder;
    
    return (
      <Text fontSize="sm" color={mutedColor}>
        {displayValue}
      </Text>
    );
  }
  
  // RELATION PROPERTY
  if (propertyType === 'relation') {
    if (!databaseId) {
      return <Text color={mutedColor} fontSize="13px">No database ID</Text>;
    }
    
    // Determine if this is a multi-relation based on value
    const isMultiple = Array.isArray(value);
    
    return (
      <Box>
        <RelationPropertyDisplay
          value={value}
          variant="compact"
          onClick={readOnly ? undefined : () => setShowRelationPicker(true)}
        />
        {showRelationPicker && !readOnly && (
          <RelationPicker
            databaseId={databaseId}
            value={value}
            onChange={(selectedRelation) => {
              onChange(selectedRelation);
              if (!isMultiple) {
                setShowRelationPicker(false);
              }
            }}
            onClose={() => setShowRelationPicker(false)}
            multiple={isMultiple}
            placeholder="Link to a page..."
          />
        )}
      </Box>
    );
  }
  
  // ROLLUP PROPERTY (Read-only computed)
  if (propertyType === 'rollup') {
    return (
      <Text fontSize="sm" color={mutedColor}>
        {value ?? placeholder}
      </Text>
    );
  }
  
  // FALLBACK
  return (
    <Text fontSize="sm" color={mutedColor}>
      {placeholder}
    </Text>
  );
}

/**
 * PropertyValueDisplay - Read-only display of property values
 */
export function PropertyValueDisplay({
  propertyType,
  value,
  options = [],
}: {
  propertyType: PropertyType;
  value: any;
  options?: Array<{ value: string; label: string; color?: string }>;
}) {
  const mutedColor = useSemanticToken('text.secondary');
  
  if (!value && value !== 0 && value !== false) {
    return <Text fontSize="sm" color={mutedColor}>Empty</Text>;
  }
  
  // CHECKBOX
  if (propertyType === 'checkbox') {
    return <Text fontSize="sm">{value ? '✓ Checked' : '☐ Unchecked'}</Text>;
  }
  
  // SELECT
  if (propertyType === 'select') {
    const option = options.find(o => o.value === value);
    return (
      <Badge colorScheme={option?.color || 'gray'}>
        {option?.label || value}
      </Badge>
    );
  }
  
  // MULTI-SELECT
  if (propertyType === 'multi_select' && Array.isArray(value)) {
    return (
      <HStack spacing={1} flexWrap="wrap">
        {value.map(val => {
          const option = options.find(o => o.value === val);
          return (
            <Badge key={val} colorScheme={option?.color || 'gray'}>
              {option?.label || val}
            </Badge>
          );
        })}
      </HStack>
    );
  }
  
  // DATE
  if (propertyType === 'date') {
    return <Text fontSize="sm">{new Date(value).toLocaleDateString()}</Text>;
  }
  
  // TIME
  if (propertyType === 'created_time' || propertyType === 'last_edited_time') {
    return <Text fontSize="sm">{new Date(value).toLocaleString()}</Text>;
  }
  
  // URL
  if (propertyType === 'url') {
    return (
      <Text fontSize="sm" color="blue.500" textDecoration="underline" cursor="pointer">
        {value}
      </Text>
    );
  }
  
  // DEFAULT
  return <Text fontSize="sm">{String(value)}</Text>;
}
