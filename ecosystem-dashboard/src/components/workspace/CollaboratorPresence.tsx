/**
 * CollaboratorPresence - Shows active collaborators in real-time
 * Displays avatars and cursors of users editing the same page
 */

import React from 'react';
import {
  HStack,
  Avatar,
  AvatarGroup,
  Tooltip,
  Box,
  Text,
  Badge,
} from '@chakra-ui/react';
import { getUserColor } from '@/hooks/useWorkspaceSync';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface CollaboratorPresenceProps {
  collaborators: Collaborator[];
  maxVisible?: number;
  showNames?: boolean;
}

export function CollaboratorPresence({
  collaborators,
  maxVisible = 4,
  showNames = false,
}: CollaboratorPresenceProps) {
  const borderColor = useSemanticToken('border.subtle');

  if (collaborators.length === 0) return null;

  return (
    <HStack spacing={2}>
      <AvatarGroup size="sm" max={maxVisible}>
        {collaborators.map((user) => (
          <Tooltip
            key={user.id}
            label={user.name}
            placement="bottom"
            hasArrow
          >
            <Avatar
              name={user.name}
              src={user.avatar}
              size="sm"
              border="2px solid"
              borderColor={getUserColor(user.id)}
              cursor="pointer"
            />
          </Tooltip>
        ))}
      </AvatarGroup>
      
      {showNames && collaborators.length > 0 && (
        <Text fontSize="xs" color="gray.500">
          {collaborators.length === 1
            ? `${collaborators[0].name} is editing`
            : `${collaborators.length} people editing`}
        </Text>
      )}
    </HStack>
  );
}

interface CollaboratorCursorProps {
  userId: string;
  userName: string;
  position: { x: number; y: number };
}

export function CollaboratorCursor({ userId, userName, position }: CollaboratorCursorProps) {
  const color = getUserColor(userId);

  return (
    <Box
      position="fixed"
      left={position.x}
      top={position.y}
      pointerEvents="none"
      zIndex={9999}
      transform="translate(-2px, -2px)"
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.65376 12.4563L5.65376 5.65376L12.4563 5.65376L5.65376 12.4563Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Name label */}
      <Badge
        position="absolute"
        left="16px"
        top="16px"
        bg={color}
        color="white"
        fontSize="xs"
        px={2}
        py={0.5}
        borderRadius="md"
        fontWeight="medium"
        whiteSpace="nowrap"
      >
        {userName}
      </Badge>
    </Box>
  );
}

interface CollaboratorSelectionProps {
  userId: string;
  userName: string;
  blockId: string;
}

export function CollaboratorSelection({ userId, userName, blockId }: CollaboratorSelectionProps) {
  const color = getUserColor(userId);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
      border="2px solid"
      borderColor={color}
      borderRadius="sm"
      opacity={0.3}
    >
      <Badge
        position="absolute"
        top="-20px"
        left="0"
        bg={color}
        color="white"
        fontSize="xs"
        px={1}
        borderRadius="sm"
      >
        {userName}
      </Badge>
    </Box>
  );
}

interface SyncStatusIndicatorProps {
  connected: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

export function SyncStatusIndicator({
  connected,
  syncing,
  lastSyncTime,
  error,
}: SyncStatusIndicatorProps) {
  const getStatusColor = () => {
    if (error) return 'red';
    if (!connected) return 'gray';
    if (syncing) return 'yellow';
    return 'green';
  };

  const getStatusText = () => {
    if (error) return 'Sync error';
    if (!connected) return 'Offline';
    if (syncing) return 'Syncing...';
    if (lastSyncTime) {
      const seconds = Math.floor((Date.now() - lastSyncTime) / 1000);
      if (seconds < 5) return 'Saved';
      if (seconds < 60) return `Saved ${seconds}s ago`;
      return `Saved ${Math.floor(seconds / 60)}m ago`;
    }
    return 'Connected';
  };

  return (
    <Tooltip label={error || getStatusText()} placement="bottom">
      <HStack spacing={1} cursor="default">
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg={`${getStatusColor()}.400`}
          animation={syncing ? 'pulse 1s infinite' : undefined}
          sx={{
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
        <Text fontSize="xs" color="gray.500">
          {getStatusText()}
        </Text>
      </HStack>
    </Tooltip>
  );
}
