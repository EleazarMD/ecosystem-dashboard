/**
 * Workspace Switcher Component
 * Clean, minimal dropdown for switching between workspaces
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiPlus,
  FiCheck,
  FiSearch,
  FiShare2,
} from 'react-icons/fi';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings?: { icon?: string };
  created_at?: string;
  is_shared?: boolean;
  shared_from?: string;
}

interface WorkspaceSwitcherProps {
  currentWorkspace: Workspace | null;
  userId: string;
  onWorkspaceChange?: (workspaceId: string) => void;
  onSettingsClick?: () => void;
  onInviteClick?: () => void;
}

export function WorkspaceSwitcher({
  currentWorkspace,
  userId,
  onWorkspaceChange,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const interactivePrimary = useSemanticToken('interactive.primary');

  useEffect(() => {
    loadWorkspaces();
  }, [userId]);

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, include_shared: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const handleWorkspaceSwitch = (workspaceId: string) => {
    onWorkspaceChange?.(workspaceId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateWorkspace = async () => {
    const workspaceName = searchQuery.trim() || prompt('Enter workspace name:');
    if (!workspaceName) return;

    try {
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          owner_id: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Workspace created',
          status: 'success',
          duration: 2000,
        });
        loadWorkspaces();
        onWorkspaceChange?.(data.workspace.id);
        setIsOpen(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      toast({
        title: 'Failed to create workspace',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getWorkspaceIcon = (ws: Workspace) => {
    return ws.settings?.icon || (ws.is_shared ? '🤖' : '📁');
  };

  const ownedWorkspaces = workspaces.filter(ws => !ws.is_shared);
  const sharedWorkspaces = workspaces.filter(ws => ws.is_shared);

  const filteredOwned = ownedWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredShared = sharedWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentWorkspace) return null;

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => { setIsOpen(false); setSearchQuery(''); }}
      placement="bottom-start"
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <HStack
          onClick={() => setIsOpen(!isOpen)}
          cursor="pointer"
          px={3}
          py={2}
          _hover={{ bg: hoverBg }}
          borderRadius="md"
          transition="all 0.15s"
          spacing={2}
        >
          <Text fontSize="lg">{getWorkspaceIcon(currentWorkspace)}</Text>
          <Text fontSize="sm" fontWeight="600" color={textPrimary} noOfLines={1} flex={1}>
            {currentWorkspace.name}
          </Text>
          <Icon
            as={FiChevronDown}
            boxSize={3.5}
            color={textSecondary}
            transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 0.2s"
          />
        </HStack>
      </PopoverTrigger>

      <PopoverContent
        w="280px"
        bg={surfaceElevated}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        _focus={{ outline: 'none' }}
      >
        <PopoverBody p={0}>
          {/* Search */}
          <Box p={2}>
            <InputGroup size="sm">
              <InputLeftElement>
                <Icon as={FiSearch} color={textTertiary} boxSize={3.5} />
              </InputLeftElement>
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                border="none"
                bg="transparent"
                _focus={{ boxShadow: 'none' }}
                fontSize="sm"
              />
            </InputGroup>
          </Box>

          <Divider borderColor={borderColor} />

          {/* Workspace List */}
          <Box maxH="300px" overflowY="auto" py={1}>
            {/* Owned Workspaces */}
            {filteredOwned.length > 0 && (
              <Box>
                <Text fontSize="2xs" fontWeight="600" color={textTertiary} px={3} py={1.5} textTransform="uppercase">
                  Your Workspaces
                </Text>
                {filteredOwned.map((ws) => (
                  <HStack
                    key={ws.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={ws.id === currentWorkspace.id ? hoverBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleWorkspaceSwitch(ws.id)}
                    transition="background 0.1s"
                  >
                    <Text fontSize="md">{getWorkspaceIcon(ws)}</Text>
                    <Text fontSize="sm" color={textPrimary} flex={1} noOfLines={1}>
                      {ws.name}
                    </Text>
                    {ws.id === currentWorkspace.id && (
                      <Icon as={FiCheck} boxSize={4} color={interactivePrimary} />
                    )}
                  </HStack>
                ))}
              </Box>
            )}

            {/* Shared Workspaces */}
            {filteredShared.length > 0 && (
              <Box>
                <HStack px={3} py={1.5} spacing={1}>
                  <Icon as={FiShare2} boxSize={3} color={textTertiary} />
                  <Text fontSize="2xs" fontWeight="600" color={textTertiary} textTransform="uppercase">
                    Shared with you
                  </Text>
                </HStack>
                {filteredShared.map((ws) => (
                  <HStack
                    key={ws.id}
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={ws.id === currentWorkspace.id ? hoverBg : 'transparent'}
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleWorkspaceSwitch(ws.id)}
                    transition="background 0.1s"
                  >
                    <Text fontSize="md">{getWorkspaceIcon(ws)}</Text>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="sm" color={textPrimary} noOfLines={1}>
                        {ws.name}
                      </Text>
                      <Text fontSize="2xs" color={textTertiary}>
                        {ws.shared_from === 'openclaw-agent' ? 'OpenClaw' : ws.shared_from}
                      </Text>
                    </VStack>
                    {ws.id === currentWorkspace.id && (
                      <Icon as={FiCheck} boxSize={4} color={interactivePrimary} />
                    )}
                  </HStack>
                ))}
              </Box>
            )}

            {/* No results */}
            {filteredOwned.length === 0 && filteredShared.length === 0 && searchQuery && (
              <Text fontSize="sm" color={textTertiary} px={3} py={4} textAlign="center">
                No workspaces found
              </Text>
            )}
          </Box>

          <Divider borderColor={borderColor} />

          {/* Create New */}
          <Box p={1}>
            <HStack
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: hoverBg }}
              borderRadius="md"
              onClick={handleCreateWorkspace}
              transition="background 0.1s"
            >
              <Icon as={FiPlus} boxSize={4} color={interactivePrimary} />
              <Text fontSize="sm" color={interactivePrimary} fontWeight="500">
                {searchQuery ? `Create "${searchQuery}"` : 'New workspace'}
              </Text>
            </HStack>
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
