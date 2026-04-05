/**
 * PropertyField - Complete property field with label, icon, and value editor
 * Used in modals, tables, boards, and other views
 */

import React from 'react';
import {
  HStack,
  VStack,
  Text,
  IconButton,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiTrash2, FiEdit2, FiMoreVertical } from 'react-icons/fi';
import { PropertyType } from '@/lib/property-registry';
import { PropertyValueEditor, PropertyValueDisplay } from './PropertyValueEditor';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PropertyFieldProps {
  // Property metadata
  propertyId?: string;
  propertyName: string;
  propertyType: PropertyType;
  propertyIcon?: string;
  
  // Value
  value: any;
  onChange?: (value: any) => void;
  
  // Configuration
  options?: Array<{ value: string; label: string; color?: string }>;
  placeholder?: string;
  readOnly?: boolean;
  editable?: boolean;
  
  // Actions
  onRemove?: () => void;
  onEdit?: () => void;
  
  // Layout
  labelWidth?: string;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
}

export function PropertyField({
  propertyId,
  propertyName,
  propertyType,
  propertyIcon,
  value,
  onChange,
  options = [],
  placeholder,
  readOnly = false,
  editable = true,
  onRemove,
  onEdit,
  labelWidth = '120px',
  size = 'sm',
  showActions = true,
}: PropertyFieldProps) {
  const mutedColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.base');
  
  const isComputedProperty = [
    'formula',
    'rollup',
    'created_time',
    'created_by',
    'last_edited_time',
    'last_edited_by',
  ].includes(propertyType);
  
  const isActuallyReadOnly = readOnly || isComputedProperty;
  
  return (
    <HStack
      spacing={4}
      align="flex-start"
      py={2}
      px={2}
      borderRadius="md"
      _hover={{ bg: showActions ? hoverBg : 'transparent' }}
      transition="background 0.1s"
    >
      {/* Property Label */}
      <HStack
        spacing={2}
        minW={labelWidth}
        color={mutedColor}
        flex="0 0 auto"
      >
        {propertyIcon && (
          <Text fontSize="lg">{propertyIcon}</Text>
        )}
        <Text fontSize="sm" fontWeight="500">
          {propertyName}
        </Text>
      </HStack>
      
      {/* Property Value */}
      <HStack flex={1} spacing={2}>
        {editable && !isActuallyReadOnly ? (
          <PropertyValueEditor
            propertyType={propertyType}
            value={value}
            onChange={onChange || (() => {})}
            placeholder={placeholder}
            options={options}
            readOnly={isActuallyReadOnly}
            size={size}
          />
        ) : (
          <PropertyValueDisplay
            propertyType={propertyType}
            value={value}
            options={options}
          />
        )}
        
        {/* Read-only indicator */}
        {isComputedProperty && (
          <Text fontSize="xs" color={mutedColor} fontStyle="italic">
            Auto
          </Text>
        )}
      </HStack>
      
      {/* Actions */}
      {showActions && !isActuallyReadOnly && (
        <HStack spacing={1} opacity={0.6} _groupHover={{ opacity: 1 }}>
          {onEdit && (
            <Tooltip label="Edit property" placement="top">
              <IconButton
                icon={<Icon as={FiEdit2} />}
                aria-label="Edit property"
                size="xs"
                variant="ghost"
                onClick={onEdit}
              />
            </Tooltip>
          )}
          
          {onRemove && (
            <Tooltip label="Remove property" placement="top">
              <IconButton
                icon={<Icon as={FiTrash2} />}
                aria-label="Remove property"
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={onRemove}
              />
            </Tooltip>
          )}
        </HStack>
      )}
    </HStack>
  );
}

/**
 * PropertyFieldCompact - Compact version for cards and list items
 */
export function PropertyFieldCompact({
  propertyName,
  propertyType,
  propertyIcon,
  value,
  options = [],
}: Pick<PropertyFieldProps, 'propertyName' | 'propertyType' | 'propertyIcon' | 'value' | 'options'>) {
  const mutedColor = useSemanticToken('text.secondary');
  
  if (!value && value !== 0 && value !== false) {
    return null; // Don't show empty properties in compact mode
  }
  
  return (
    <HStack spacing={2} fontSize="xs">
      {/* Icon + Name */}
      <HStack spacing={1} color={mutedColor}>
        {propertyIcon && <Text>{propertyIcon}</Text>}
        <Text fontWeight="500">{propertyName}:</Text>
      </HStack>
      
      {/* Value */}
      <PropertyValueDisplay
        propertyType={propertyType}
        value={value}
        options={options}
      />
    </HStack>
  );
}

/**
 * PropertyRow - Property row for table views
 */
export function PropertyRow({
  propertyName,
  propertyType,
  propertyIcon,
  value,
  onChange,
  options = [],
  readOnly = false,
}: Pick<PropertyFieldProps, 'propertyName' | 'propertyType' | 'propertyIcon' | 'value' | 'onChange' | 'options' | 'readOnly'>) {
  const isComputedProperty = [
    'formula',
    'rollup',
    'created_time',
    'created_by',
    'last_edited_time',
    'last_edited_by',
  ].includes(propertyType);
  
  const isActuallyReadOnly = readOnly || isComputedProperty;
  
  if (isActuallyReadOnly) {
    return (
      <PropertyValueDisplay
        propertyType={propertyType}
        value={value}
        options={options}
      />
    );
  }
  
  return (
    <PropertyValueEditor
      propertyType={propertyType}
      value={value}
      onChange={onChange || (() => {})}
      options={options}
      readOnly={isActuallyReadOnly}
      size="sm"
    />
  );
}
