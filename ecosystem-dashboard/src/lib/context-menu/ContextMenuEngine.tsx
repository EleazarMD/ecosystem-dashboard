/**
 * Context Menu Engine
 * 
 * Reusable context menu component that renders grouped actions.
 * Used across all dashboard platforms for consistent UX.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Box, HStack, VStack, Text, Portal, Kbd } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { ContextMenuConfig, ContextMenuPosition, ContextMenuItem, MenuItemVariant } from './types';

interface MenuItemComponentProps {
  item: ContextMenuItem;
  onClose: () => void;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item, onClose }) => {
  const hoverBg = useSemanticToken('interactive.surfaceHover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  
  const variantColors: Record<MenuItemVariant, string> = {
    default: textPrimary,
    danger: '#E53E3E',
    success: '#38A169',
    warning: '#DD6B20',
  };

  const handleClick = async () => {
    if (item.disabled) return;
    try {
      await item.onClick();
    } finally {
      onClose();
    }
  };

  if (item.hidden) return null;

  const Icon = item.icon;
  const color = variantColors[item.variant || 'default'];

  return (
    <HStack
      px={2}
      py={1.5}
      mx={1}
      cursor={item.disabled ? 'not-allowed' : 'pointer'}
      opacity={item.disabled ? 0.4 : 1}
      _hover={{ bg: item.disabled ? 'transparent' : hoverBg }}
      onClick={handleClick}
      spacing={2}
      borderRadius="sm"
      role="menuitem"
      tabIndex={item.disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {Icon && (
        <Icon
          style={{
            width: 14,
            height: 14,
            color: color,
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
      )}
      <Text
        fontSize="13px"
        color={color}
        flex={1}
      >
        {item.label}
      </Text>
      {item.shortcut && (
        <Text fontSize="11px" color={textSecondary} opacity={0.5}>
          {item.shortcut}
        </Text>
      )}
    </HStack>
  );
};

interface ContextMenuEngineProps {
  isOpen: boolean;
  onClose: () => void;
  position: ContextMenuPosition;
  config: ContextMenuConfig | null;
}

export const ContextMenuEngine: React.FC<ContextMenuEngineProps> = ({
  isOpen,
  onClose,
  position,
  config,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  const glassBg = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const textSecondary = useSemanticToken('text.secondary');

  // Close on click outside or escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    // Small delay to prevent immediate close on the same click that opened
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !config) return null;

  // Adjust position to stay within viewport
  const menuWidth = config.width || 180;
  const menuHeight = 280;
  const adjustedPosition = {
    x: typeof window !== 'undefined' 
      ? Math.min(position.x, window.innerWidth - menuWidth - 10) 
      : position.x,
    y: typeof window !== 'undefined' 
      ? Math.min(position.y, window.innerHeight - menuHeight - 10) 
      : position.y,
  };

  return (
    <Portal>
      <Box
        ref={menuRef}
        position="fixed"
        left={`${adjustedPosition.x}px`}
        top={`${adjustedPosition.y}px`}
        zIndex={9999}
        bg={glassBg}
        backdropFilter="blur(12px)"
        border="1px solid"
        borderColor={glassBorder}
        borderRadius="md"
        boxShadow="0 4px 16px rgba(0,0,0,0.2)"
        py={1}
        minW={`${menuWidth}px`}
        overflow="hidden"
        role="menu"
      >
        {/* Groups - no header for compact style */}
        {config.groups.map((group, groupIndex) => {
          const visibleItems = group.items.filter(item => !item.hidden);
          if (visibleItems.length === 0) return null;

          return (
            <React.Fragment key={group.id}>
              {groupIndex > 0 && (
                <Box h="1px" bg={glassBorder} mx={2} my={0.5} />
              )}
              <Box py={0.5}>
                {visibleItems.map((item) => (
                  <MenuItemComponent
                    key={item.id}
                    item={item}
                    onClose={onClose}
                  />
                ))}
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Portal>
  );
};

export default ContextMenuEngine;
