/**
 * Editable Field Component
 * Inline editing with save/cancel controls
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Textarea,
  IconButton,
  HStack,
  Text,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  isDisabled?: boolean;
  fontSize?: string;
  fontWeight?: string;
  label?: string;
}

export function EditableField({
  value,
  onSave,
  placeholder = 'Enter value',
  multiline = false,
  isDisabled = false,
  fontSize = 'md',
  fontWeight = 'normal',
  label,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue.trim() === value) {
      setIsEditing(false);
      return;
    }

    if (!editValue.trim()) {
      toast({
        title: 'Validation Error',
        description: `${label || 'Field'} cannot be empty`,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      toast({
        title: 'Updated',
        description: `${label || 'Field'} updated successfully`,
        status: 'success',
        duration: 2000,
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update',
        status: 'error',
        duration: 5000,
      });
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <HStack spacing={2} w="full">
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            size="sm"
            rows={3}
            flex={1}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            size="sm"
            fontSize={fontSize}
            fontWeight={fontWeight}
            flex={1}
          />
        )}
        <Tooltip label="Save (Enter)">
          <IconButton
            aria-label="Save"
            icon={<CheckIcon className="w-4 h-4" />}
            size="sm"
            colorScheme="green"
            onClick={handleSave}
            isLoading={isSaving}
          />
        </Tooltip>
        <Tooltip label="Cancel (Esc)">
          <IconButton
            aria-label="Cancel"
            icon={<XMarkIcon className="w-4 h-4" />}
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            isDisabled={isSaving}
          />
        </Tooltip>
      </HStack>
    );
  }

  return (
    <HStack
      spacing={2}
      w="full"
      _hover={{ bg: 'blackAlpha.50' }}
      px={2}
      py={1}
      borderRadius="md"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      onClick={() => !isDisabled && setIsEditing(true)}
    >
      <Text
        fontSize={fontSize}
        fontWeight={fontWeight}
        flex={1}
        color={value ? 'inherit' : 'gray.400'}
      >
        {value || placeholder}
      </Text>
      {!isDisabled && (
        <Tooltip label="Click to edit">
          <IconButton
            aria-label="Edit"
            icon={<PencilIcon className="w-4 h-4" />}
            size="xs"
            variant="ghost"
            opacity={0.6}
            _hover={{ opacity: 1 }}
          />
        </Tooltip>
      )}
    </HStack>
  );
}
