/**
 * Page Control Bar
 * Appears between cover and content, adapts to page type
 * Left side: View switchers or context-specific actions
 * Right side: Filter, Sort, Search, Settings, and primary action button
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  HStack,
  Button,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  FiTable,
  FiCalendar,
  FiGrid,
  FiTrello,
  FiFilter,
  FiArrowUp,
  FiSearch,
  FiSettings,
  FiPlus,
  FiChevronDown,
} from 'react-icons/fi';

export type PageView = 'table' | 'calendar' | 'gallery' | 'board' | 'timeline' | 'list';
export type PageType = 'database' | 'document' | 'board' | 'wiki';

interface PageControlBarProps {
  pageType: PageType;
  currentView?: PageView;
  onViewChange?: (view: PageView) => void;
  activeFilters?: number;
  activeSorts?: number;
  onFilterClick?: () => void;
  onSortClick?: () => void;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onNewClick?: () => void;
  primaryActionLabel?: string;
}

const VIEW_OPTIONS: Record<PageType, Array<{ id: PageView; label: string; icon: any }>> = {
  database: [
    { id: 'table' as PageView, label: 'Show All', icon: FiTable },
    { id: 'calendar' as PageView, label: 'Calendar', icon: FiCalendar },
    { id: 'gallery' as PageView, label: 'Gallery', icon: FiGrid },
    { id: 'board' as PageView, label: 'Board', icon: FiTrello },
  ],
  document: [],
  board: [
    { id: 'board' as PageView, label: 'Board', icon: FiTrello },
    { id: 'table' as PageView, label: 'Table', icon: FiTable },
  ],
  wiki: [],
};

export function PageControlBar({
  pageType,
  currentView,
  onViewChange,
  activeFilters = 0,
  activeSorts = 0,
  onFilterClick,
  onSortClick,
  onSearchClick,
  onSettingsClick,
  onNewClick,
  primaryActionLabel = 'New',
}: PageControlBarProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const buttonBorder = useSemanticToken('border.default');
  const activeButtonBg = useSemanticToken('surface.hover');
  const activeButtonBorder = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedTextColor = useSemanticToken('text.secondary');

  return (
    <HStack
      px={8}
      py={2}
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      justify="space-between"
      spacing={3}
    >
      {/* Left Side: View Switchers (context-specific) */}
      <HStack spacing={1.5}>
        {VIEW_OPTIONS[pageType].map((view) => {
          const isActive = currentView === view.id;
          return (
            <Button
              key={view.id}
              size="xs"
              height="28px"
              px={3}
              variant="outline"
              leftIcon={<Icon as={view.icon} boxSize={3.5} />}
              onClick={() => onViewChange?.(view.id)}
              bg={isActive ? activeButtonBg : 'transparent'}
              border="1px solid"
              borderColor={isActive ? activeButtonBorder : buttonBorder}
              color={textColor}
              fontSize="13px"
              fontWeight={isActive ? '500' : '400'}
              _hover={{ 
                bg: hoverBg,
                borderColor: activeButtonBorder
              }}
              _active={{
                transform: 'scale(0.98)'
              }}
            >
              {view.label}
            </Button>
          );
        })}
      </HStack>

      {/* Right Side: Control Buttons */}
      <HStack spacing={1.5}>
        {/* Filter */}
        {onFilterClick && (
          <Tooltip label="Filter" placement="bottom" hasArrow>
            <Button
              size="xs"
              height="28px"
              px={3}
              variant="outline"
              leftIcon={<Icon as={FiFilter} boxSize={3.5} />}
              onClick={onFilterClick}
              border="1px solid"
              borderColor={buttonBorder}
              bg="transparent"
              color={textColor}
              fontSize="13px"
              fontWeight="400"
              _hover={{ 
                bg: hoverBg,
                borderColor: activeButtonBorder
              }}
            >
              Filter
              {activeFilters > 0 && (
                <Badge ml={1.5} colorScheme="blue" fontSize="10px" px={1.5} py={0.5} borderRadius="full">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </Tooltip>
        )}

        {/* Sort */}
        {onSortClick && (
          <Tooltip label="Sort" placement="bottom" hasArrow>
            <Button
              size="xs"
              height="28px"
              px={3}
              variant="outline"
              leftIcon={<Icon as={FiArrowUp} boxSize={3.5} />}
              onClick={onSortClick}
              border="1px solid"
              borderColor={buttonBorder}
              bg="transparent"
              color={textColor}
              fontSize="13px"
              fontWeight="400"
              _hover={{ 
                bg: hoverBg,
                borderColor: activeButtonBorder
              }}
            >
              Sort
              {activeSorts > 0 && (
                <Badge ml={1.5} colorScheme="blue" fontSize="10px" px={1.5} py={0.5} borderRadius="full">
                  {activeSorts}
                </Badge>
              )}
            </Button>
          </Tooltip>
        )}

        {/* Search */}
        {onSearchClick && (
          <Tooltip label="Search" placement="bottom" hasArrow>
            <IconButton
              icon={<Icon as={FiSearch} boxSize={3.5} />}
              aria-label="Search"
              size="xs"
              height="28px"
              width="28px"
              minW="28px"
              variant="outline"
              border="1px solid"
              borderColor={buttonBorder}
              bg="transparent"
              color={mutedTextColor}
              onClick={onSearchClick}
              _hover={{ 
                bg: hoverBg,
                borderColor: activeButtonBorder,
                color: textColor
              }}
            />
          </Tooltip>
        )}

        {/* Settings */}
        {onSettingsClick && (
          <Tooltip label="View settings" placement="bottom" hasArrow>
            <IconButton
              icon={<Icon as={FiSettings} boxSize={3.5} />}
              aria-label="Settings"
              size="xs"
              height="28px"
              width="28px"
              minW="28px"
              variant="outline"
              border="1px solid"
              borderColor={buttonBorder}
              bg="transparent"
              color={mutedTextColor}
              onClick={onSettingsClick}
              _hover={{ 
                bg: hoverBg,
                borderColor: activeButtonBorder,
                color: textColor
              }}
            />
          </Tooltip>
        )}

        {/* Primary Action Button */}
        {onNewClick && (
          <Button
            size="xs"
            height="28px"
            px={3}
            colorScheme="blue"
            leftIcon={<Icon as={FiPlus} boxSize={3.5} />}
            rightIcon={<Icon as={FiChevronDown} boxSize={3} />}
            onClick={onNewClick}
            ml={1}
            fontSize="13px"
            fontWeight="500"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: 'sm'
            }}
            _active={{
              transform: 'scale(0.98)'
            }}
          >
            {primaryActionLabel}
          </Button>
        )}
      </HStack>
    </HStack>
  );
}
