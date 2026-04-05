/**
 * Person Picker Component
 * Searchable dropdown for selecting workspace members
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  VStack,
  HStack,
  Avatar,
  Text,
  Spinner,
  Portal,
  Badge,
} from '@chakra-ui/react';
import { usePersonSearch } from '../../hooks/usePersonSearch';
import { User } from '../../types/property-values';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PersonPickerProps {
  workspaceId: string;
  value?: User | User[];
  onChange: (value: User | User[]) => void;
  multiple?: boolean;
  placeholder?: string;
  onClose?: () => void;
  autoFocus?: boolean;
}

export function PersonPicker({
  workspaceId,
  value,
  onChange,
  multiple = false,
  placeholder = 'Search people...',
  onClose,
  autoFocus = true,
}: PersonPickerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { users, loading } = usePersonSearch({ workspaceId });

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const footerBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Filter users based on query
  const filteredUsers = users.filter(user => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // Get currently selected users
  const selectedUsers = multiple && Array.isArray(value) ? value : [];

  // Filter out already selected users
  const availableUsers = filteredUsers.filter(
    user => !selectedUsers.some(selected => selected.id === user.id)
  );

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [autoFocus]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            Math.min(prev + 1, availableUsers.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (availableUsers[selectedIndex]) {
            handleSelect(availableUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, availableUsers]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleSelect = (user: User) => {
    if (multiple) {
      const newValue = [...selectedUsers, user];
      onChange(newValue);
      setQuery('');
      setSelectedIndex(0);
    } else {
      onChange(user);
      handleClose();
    }
  };

  const handleRemove = (userId: string) => {
    if (multiple && Array.isArray(value)) {
      const newValue = value.filter(u => u.id !== userId);
      onChange(newValue);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        onClick={handleClose}
        zIndex={1399}
      />

      {/* Dropdown */}
      <Portal>
        <Box
          ref={menuRef}
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          boxShadow="xl"
          minW="400px"
          maxW="500px"
          maxH="400px"
          overflow="hidden"
          zIndex={1400}
        >
          {/* Search Input */}
          <Box px="8px" py="6px" borderBottom="1px solid" borderColor={borderColor}>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              size="sm"
              fontSize="13px"
              h="28px"
              border="none"
              px="6px"
              py="4px"
              _focus={{ boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400', fontSize: '13px' }}
            />
          </Box>

          {/* Selected Users (if multiple) */}
          {multiple && selectedUsers.length > 0 && (
            <Box px="8px" py="6px" borderBottom="1px solid" borderColor={borderColor}>
              <HStack spacing={1} flexWrap="wrap">
                {selectedUsers.map(user => (
                  <Badge
                    key={user.id}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="12px"
                    colorScheme="blue"
                  >
                    <Avatar size="xs" name={user.full_name || user.username} src={user.avatar_url} />
                    <Text>{user.full_name || user.username}</Text>
                    <Text
                      as="span"
                      cursor="pointer"
                      onClick={() => handleRemove(user.id)}
                      _hover={{ opacity: 0.7 }}
                    >
                      ×
                    </Text>
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {/* User List */}
          <Box maxH="300px" overflowY="auto">
            {loading ? (
              <Box p={4} textAlign="center">
                <Spinner size="sm" />
              </Box>
            ) : availableUsers.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text color={mutedColor} fontSize="13px">
                  No people found
                </Text>
              </Box>
            ) : (
              <VStack align="stretch" spacing={0} py={1}>
                {availableUsers.map((user, index) => (
                  <HStack
                    key={user.id}
                    data-index={index}
                    px="6px"
                    py="6px"
                    h="40px"
                    spacing={2}
                    bg={index === selectedIndex ? selectedBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    onClick={() => handleSelect(user)}
                    borderRadius="md"
                    mx={1}
                  >
                    <Avatar
                      size="sm"
                      name={user.full_name || user.username}
                      src={user.avatar_url}
                    />
                    
                    <VStack align="stretch" spacing={0} flex={1}>
                      <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
                        {user.full_name || user.username}
                      </Text>
                      <Text fontSize="11px" color={mutedColor} lineHeight="1.2">
                        {user.email}
                      </Text>
                    </VStack>

                    {user.role && (
                      <Badge
                        size="sm"
                        fontSize="10px"
                        colorScheme={user.role === 'admin' ? 'purple' : 'gray'}
                      >
                        {user.role}
                      </Badge>
                    )}
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>

          {/* Footer */}
          <Box
            px="8px"
            py="6px"
            h="28px"
            borderTop="1px solid"
            borderColor={borderColor}
            bg={footerBg}
          >
            <HStack fontSize="10px" color={mutedColor} justify="space-between" h="full" align="center">
              <HStack spacing={2}>
                <Text>↑↓ Navigate</Text>
                <Text>↵ Select</Text>
              </HStack>
              <Text>esc Close</Text>
            </HStack>
          </Box>
        </Box>
      </Portal>
    </>
  );
}
