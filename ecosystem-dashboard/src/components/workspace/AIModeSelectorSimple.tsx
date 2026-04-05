/**
 * Simple AI Mode Selector
 * Allows users to switch between Quick, Context, Research, Code, and Search modes
 */

import React from 'react';
import {
  ButtonGroup,
  Button,
  HStack,
  Text,
  Icon,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import { FiZap, FiDatabase, FiSearch, FiCode, FiGlobe } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

type AIMode = 'quick' | 'context' | 'research' | 'code' | 'search';

interface AIModeSelectorProps {
  selectedMode: AIMode;
  onModeChange: (mode: AIMode) => void;
  compact?: boolean;
}

export function AIModeSelectorSimple({ 
  selectedMode, 
  onModeChange,
  compact = false,
}: AIModeSelectorProps) {
  const activeBg = 'blue.500';
  const activeColor = 'white';
  const inactiveBg = useSemanticToken('surface.base');
  const inactiveColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');

  const modes = [
    {
      id: 'quick' as AIMode,
      label: 'Quick',
      icon: FiZap,
      tooltip: 'Fast conversational AI',
      color: 'blue',
    },
    {
      id: 'context' as AIMode,
      label: 'Context',
      icon: FiDatabase,
      tooltip: 'AI with workspace awareness',
      color: 'purple',
    },
    {
      id: 'search' as AIMode,
      label: 'Search',
      icon: FiGlobe,
      tooltip: 'Search workspace + web',
      color: 'teal',
      badge: 'NEW',
    },
    {
      id: 'code' as AIMode,
      label: 'Code',
      icon: FiCode,
      tooltip: 'Expert coding help',
      color: 'orange',
    },
    {
      id: 'research' as AIMode,
      label: 'Research',
      icon: FiSearch,
      tooltip: 'Deep research & analysis',
      color: 'green',
    },
  ];

  return (
    <ButtonGroup size={compact ? 'xs' : 'sm'} isAttached variant="outline" spacing={0}>
      {modes.map((mode) => {
        const isActive = selectedMode === mode.id;
        
        return (
          <Tooltip key={mode.id} label={mode.tooltip} placement="top">
            <Button
              onClick={() => onModeChange(mode.id)}
              bg={isActive ? activeBg : inactiveBg}
              color={isActive ? activeColor : inactiveColor}
              borderColor={isActive ? activeBg : 'gray.300'}
              _hover={{
                bg: isActive ? activeBg : hoverBg,
              }}
              leftIcon={<Icon as={mode.icon} />}
              rightIcon={
                mode.badge ? (
                  <Badge colorScheme={mode.color} fontSize="2xs" ml={-1}>
                    {mode.badge}
                  </Badge>
                ) : undefined
              }
              fontWeight={isActive ? 'semibold' : 'normal'}
            >
              {compact ? null : mode.label}
            </Button>
          </Tooltip>
        );
      })}
    </ButtonGroup>
  );
}
