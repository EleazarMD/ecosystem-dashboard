/**
 * CalendarSidebar - Shared sidebar component for calendar pages
 * Used by both /calendar and /calendar-intelligence pages
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Collapse,
  Badge,
} from '@chakra-ui/react';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CalendarIcon as CalendarSolidIcon } from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarAccount {
  id: string;
  name: string;
  type: 'personal' | 'work';
  color: string;
  calendars: CalendarItem[];
}

export interface CalendarItem {
  id: string;
  name: string;
  color: string;
  eventCount?: number;
}

interface SidebarSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  textSecondary: string;
  indicator?: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
  textSecondary,
  indicator,
}) => (
  <Box>
    <HStack
      px={3}
      py={1.5}
      cursor="pointer"
      onClick={onToggle}
      _hover={{ bg: 'whiteAlpha.100' }}
      spacing={1}
    >
      {isExpanded ? (
        <ChevronDownIcon style={{ width: '10px', height: '10px', color: textSecondary }} />
      ) : (
        <ChevronRightIcon style={{ width: '10px', height: '10px', color: textSecondary }} />
      )}
      {indicator && (
        <Box w="8px" h="8px" borderRadius="full" bg={indicator} />
      )}
      <Text fontSize="10px" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">
        {title}
      </Text>
    </HStack>
    <Collapse in={isExpanded}>
      <VStack spacing={0} align="stretch" pl={2}>
        {children}
      </VStack>
    </Collapse>
  </Box>
);

interface SidebarItemProps {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick: () => void;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  iconColor?: string;
  color?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  count,
  isActive,
  onClick,
  bgHover,
  textPrimary,
  textSecondary,
  iconColor,
  color,
}) => (
  <HStack
    px={3}
    py={1.5}
    cursor="pointer"
    onClick={onClick}
    bg="transparent"
    _hover={{ bg: bgHover }}
    borderRadius="6px"
    mx={1}
    spacing={2}
    opacity={isActive ? 1 : 0.5}
  >
    {color && <Box w="8px" h="8px" borderRadius="full" bg={color} flexShrink={0} />}
    {icon && !color && (
      <Box color={iconColor || textSecondary} flexShrink={0}>
        {icon}
      </Box>
    )}
    <Text
      fontSize="12px"
      color={textPrimary}
      fontWeight="400"
      flex="1"
      isTruncated
    >
      {label}
    </Text>
    {count !== undefined && count > 0 && (
      <Badge
        fontSize="9px"
        colorScheme="gray"
        variant="subtle"
        borderRadius="full"
        px={1.5}
      >
        {count}
      </Badge>
    )}
  </HStack>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CalendarSidebarProps {
  activeView: 'calendar' | 'intelligence';
  selectedCalendarIds?: Set<string>;
  onCalendarToggle?: (calendarId: string) => void;
  onSelectAll?: () => void;
}

export function CalendarSidebar({
  activeView,
  selectedCalendarIds,
  onCalendarToggle,
  onSelectAll,
}: CalendarSidebarProps) {
  const router = useRouter();

  // Theme tokens
  const bgSecondary = useSemanticToken('surface.elevated');
  const bgHover = useSemanticToken('surface.hover');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const border = useSemanticToken('border.default');

  // State
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    views: true,
    personal: true,
    work: true,
  });
  const [allCalendarIds, setAllCalendarIds] = useState<Set<string>>(new Set());
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());

  // Use external or internal selection
  const effectiveSelectedIds = selectedCalendarIds ?? internalSelectedIds;

  // Toggle sidebar section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Toggle calendar selection
  const handleCalendarToggle = (calendarId: string) => {
    if (onCalendarToggle) {
      onCalendarToggle(calendarId);
    } else {
      setInternalSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(calendarId)) {
          newSet.delete(calendarId);
        } else {
          newSet.add(calendarId);
        }
        return newSet;
      });
    }
  };

  // Select all calendars
  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    } else {
      setInternalSelectedIds(new Set(allCalendarIds));
    }
  };

  // Check if a calendar is selected
  const isCalendarSelected = (calendarId: string) => {
    return effectiveSelectedIds.has(calendarId);
  };

  // Fetch calendar accounts
  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        
        // Deduplicate calendars by name
        const seenNames = new Set<string>();
        const uniqueCalendars = (data.calendars || []).filter((cal: any) => {
          const name = cal.name?.toLowerCase() || cal.id;
          if (seenNames.has(name)) {
            return false;
          }
          seenNames.add(name);
          return true;
        });
        
        // Group calendars by account type
        const personal: CalendarItem[] = [];
        const work: CalendarItem[] = [];

        uniqueCalendars.forEach((cal: any) => {
          const calendar: CalendarItem = {
            id: cal.id,
            name: cal.name,
            color: cal.color || '#3B82F6',
            eventCount: cal.event_count,
          };

          const name = cal.name?.toLowerCase() || '';
          const accountType = cal.account_type?.toLowerCase() || cal.calendar_type?.toLowerCase() || '';
          
          const isWork = 
            accountType === 'work' ||
            accountType === 'exchange' ||
            name.includes('exchange') ||
            name.includes('methodist') ||
            name.includes('zimlet') ||
            name.includes('work') ||
            name.includes('office') ||
            name.includes('meeting');

          if (isWork) {
            work.push(calendar);
          } else {
            personal.push(calendar);
          }
        });

        const accounts: CalendarAccount[] = [];
        
        if (personal.length > 0) {
          accounts.push({
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            color: '#FF9500',
            calendars: personal,
          });
        }
        
        if (work.length > 0) {
          accounts.push({
            id: 'work',
            name: 'Work',
            type: 'work',
            color: '#0078D4',
            calendars: work,
          });
        }
        
        if (accounts.length === 0) {
          accounts.push({
            id: 'personal',
            name: 'Personal',
            type: 'personal',
            color: '#FF9500',
            calendars: [
              { id: 'icloud', name: 'iCloud Calendar', color: '#FF9500' },
            ],
          });
        }
        
        setCalendarAccounts(accounts);
        
        // Set all calendar IDs
        const allIds = new Set<string>();
        accounts.forEach(account => {
          account.calendars.forEach(cal => allIds.add(cal.id));
        });
        setAllCalendarIds(allIds);
        
        // Select all by default if no external control
        if (!selectedCalendarIds) {
          setInternalSelectedIds(allIds);
        }
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    }
  }, [selectedCalendarIds]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return (
    <Box
      w="200px"
      minW="200px"
      h="100%"
      bg={bgSecondary}
      borderRight="1px solid"
      borderColor={border}
      overflowY="auto"
      py={1}
      fontSize="12px"
    >
      {/* Header */}
      <Box px={3} py={2}>
        <HStack spacing={2}>
          <CalendarSolidIcon style={{ width: '16px', height: '16px', color: '#3B82F6' }} />
          <Text fontSize="13px" fontWeight="600" color={textPrimary}>
            Calendar
          </Text>
        </HStack>
      </Box>

      {/* Intelligence Dashboard button — matches email sidebar pattern */}
      <Box px={2} pb={1}>
        <HStack
          spacing={2}
          p={2}
          borderRadius="8px"
          cursor="pointer"
          bg={activeView === 'intelligence'
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.10), rgba(59, 130, 246, 0.10))'}
          border="1px solid"
          borderColor={activeView === 'intelligence' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.25)'}
          _hover={{
            bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))',
            transform: 'translateY(-1px)',
          }}
          transition="all 0.2s"
          onClick={() => router.push('/calendar-intelligence')}
        >
          <SparklesIcon style={{ width: '14px', height: '14px', color: '#8B5CF6' }} />
          <Text fontSize="12px" fontWeight="600" color={textPrimary}>
            Intelligence Dashboard
          </Text>
        </HStack>
      </Box>

      {/* Views */}
      <SidebarSection
        title="Views"
        isExpanded={expandedSections.views}
        onToggle={() => toggleSection('views')}
        textSecondary={textSecondary}
      >
        <SidebarItem
          icon={<CalendarIcon style={{ width: '14px', height: '14px' }} />}
          label="Calendar"
          isActive={activeView === 'calendar'}
          onClick={() => router.push('/calendar')}
          bgHover={bgHover}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          iconColor="#3B82F6"
        />
      </SidebarSection>

      {/* Dynamic Calendar Sections */}
      {calendarAccounts.map(account => (
        <SidebarSection
          key={account.id}
          title={account.name}
          isExpanded={expandedSections[account.type] ?? true}
          onToggle={() => toggleSection(account.type)}
          textSecondary={textSecondary}
          indicator={account.color}
        >
          {account.calendars.map(cal => (
            <SidebarItem
              key={cal.id}
              label={cal.name}
              count={cal.eventCount}
              isActive={isCalendarSelected(cal.id)}
              onClick={() => handleCalendarToggle(cal.id)}
              bgHover={bgHover}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              color={cal.color}
            />
          ))}
        </SidebarSection>
      ))}
    </Box>
  );
}
