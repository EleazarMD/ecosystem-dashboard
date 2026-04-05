/**
 * Person Property Display
 * Shows person/people property values with avatars
 */

import React from 'react';
import {
  Box,
  HStack,
  VStack,
  Avatar,
  AvatarGroup,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { User } from '../../types/property-values';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PersonPropertyDisplayProps {
  value: User | User[] | null;
  variant?: 'full' | 'compact' | 'avatar-only';
  size?: 'xs' | 'sm' | 'md';
  max?: number; // Max avatars to show in group
  onClick?: () => void;
}

export function PersonPropertyDisplay({
  value,
  variant = 'full',
  size = 'sm',
  max = 3,
  onClick,
}: PersonPropertyDisplayProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const emptyColor = useSemanticToken('text.tertiary');

  if (!value) {
    return (
      <Text
        fontSize={size === 'xs' ? '12px' : '13px'}
        color={emptyColor}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        Empty
      </Text>
    );
  }

  // Single person
  if (!Array.isArray(value)) {
    const user = value;

    if (variant === 'avatar-only') {
      return (
        <Tooltip label={user.full_name || user.username}>
          <Avatar
            size={size}
            name={user.full_name || user.username}
            src={user.avatar_url}
            cursor={onClick ? 'pointer' : 'default'}
            onClick={onClick}
          />
        </Tooltip>
      );
    }

    return (
      <HStack
        spacing={2}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        <Avatar
          size={size}
          name={user.full_name || user.username}
          src={user.avatar_url}
        />
        {variant === 'full' && (
          <Box>
            <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
              {user.full_name || user.username}
            </Text>
            {user.email && (
              <Text fontSize="11px" color={mutedColor} lineHeight="1.2">
                {user.email}
              </Text>
            )}
          </Box>
        )}
      </HStack>
    );
  }

  // Multiple people
  const users = value;

  if (users.length === 0) {
    return (
      <Text
        fontSize={size === 'xs' ? '12px' : '13px'}
        color={emptyColor}
        cursor={onClick ? 'pointer' : 'default'}
        onClick={onClick}
      >
        Empty
      </Text>
    );
  }

  if (variant === 'avatar-only' || variant === 'compact') {
    return (
      <Tooltip
        label={users.map(u => u.full_name || u.username).join(', ')}
        placement="top"
      >
        <Box cursor={onClick ? 'pointer' : 'default'} onClick={onClick}>
          <AvatarGroup size={size} max={max}>
            {users.map(user => (
              <Avatar
                key={user.id}
                name={user.full_name || user.username}
                src={user.avatar_url}
              />
            ))}
          </AvatarGroup>
        </Box>
      </Tooltip>
    );
  }

  return (
    <VStack
      align="stretch"
      spacing={1}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
    >
      {users.slice(0, max).map(user => (
        <HStack key={user.id} spacing={2}>
          <Avatar
            size={size}
            name={user.full_name || user.username}
            src={user.avatar_url}
          />
          <Box>
            <Text fontSize="13px" fontWeight="500" color={textColor} lineHeight="1.2">
              {user.full_name || user.username}
            </Text>
            {user.email && (
              <Text fontSize="11px" color={mutedColor} lineHeight="1.2">
                {user.email}
              </Text>
            )}
          </Box>
        </HStack>
      ))}
      {users.length > max && (
        <Text fontSize="11px" color={mutedColor}>
          +{users.length - max} more
        </Text>
      )}
    </VStack>
  );
}
