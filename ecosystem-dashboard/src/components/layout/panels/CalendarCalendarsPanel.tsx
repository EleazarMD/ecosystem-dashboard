/**
 * CalendarCalendarsPanel - Manage calendar visibility and settings
 * Part of the streamlined calendar right panel system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Switch,
  Badge,
  Divider,
  Spinner,
  Input,
  IconButton,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiPlus,
  FiEdit2,
  FiCheck,
  FiX,
  FiCalendar,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Available calendar colors
const CALENDAR_COLORS = [
  'blue.500',
  'green.500',
  'purple.500',
  'orange.500',
  'red.500',
  'teal.500',
  'pink.500',
  'cyan.500',
  'yellow.500',
  'gray.500',
];

interface Calendar {
  id: string;
  name: string;
  color: string;
  calendar_type: string;
  sync_enabled: boolean;
}

interface CalendarCalendarsPanelProps {
  customData?: {
    calendars?: Calendar[];
    selectedCalendars?: Set<string>;
    onCalendarToggle?: (calendarId: string, enabled: boolean) => void;
  };
}

export default function CalendarCalendarsPanel({ customData }: CalendarCalendarsPanelProps) {
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Calendar editing state
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editingCalendarName, setEditingCalendarName] = useState('');
  const [editingCalendarColor, setEditingCalendarColor] = useState('');
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false);
  
  // New calendar state
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState('blue.500');
  
  const calendars = customData?.calendars || localCalendars;
  const calendarSelection = customData?.selectedCalendars || selectedCalendars;
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const mutedColor = useSemanticToken('text.secondary');

  const fetchCalendars = useCallback(async () => {
    if (customData?.calendars) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        setLocalCalendars(data.calendars || []);
        setSelectedCalendars(new Set((data.calendars || []).map((c: Calendar) => c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customData?.calendars]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const handleCalendarToggle = (calendarId: string, enabled: boolean) => {
    if (customData?.onCalendarToggle) {
      customData.onCalendarToggle(calendarId, enabled);
    } else {
      setSelectedCalendars(prev => {
        const newSet = new Set(prev);
        if (enabled) {
          newSet.add(calendarId);
        } else {
          newSet.delete(calendarId);
        }
        return newSet;
      });
    }
  };

  const startEditingCalendar = (calendar: Calendar) => {
    setEditingCalendarId(calendar.id);
    setEditingCalendarName(calendar.name);
    setEditingCalendarColor(calendar.color || 'blue.500');
  };

  const cancelEditingCalendar = () => {
    setEditingCalendarId(null);
    setEditingCalendarName('');
    setEditingCalendarColor('');
  };

  const saveCalendarEdit = async () => {
    if (!editingCalendarId || !editingCalendarName.trim()) return;
    
    setIsUpdatingCalendar(true);
    try {
      const response = await fetch(`/api/calendar/calendars/${editingCalendarId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCalendarName.trim(),
          color: editingCalendarColor,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Calendar updated',
          status: 'success',
          duration: 2000,
        });
        fetchCalendars();
        cancelEditingCalendar();
      } else {
        throw new Error('Failed to update calendar');
      }
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const createCalendar = async () => {
    if (!newCalendarName.trim()) return;
    
    setIsCreatingCalendar(true);
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCalendarName.trim(),
          color: newCalendarColor,
          calendar_type: 'local',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Calendar created',
          status: 'success',
          duration: 2000,
        });
        fetchCalendars();
        setNewCalendarName('');
        setNewCalendarColor('blue.500');
      } else {
        throw new Error('Failed to create calendar');
      }
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsCreatingCalendar(false);
    }
  };

  // Group calendars by type
  const groupedCalendars = calendars.reduce((acc, cal) => {
    const type = cal.calendar_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(cal);
    return acc;
  }, {} as Record<string, Calendar[]>);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'caldav': return 'iCloud';
      case 'exchange': return 'Work (Exchange)';
      case 'local': return 'Local';
      case 'subscribed': return 'Subscribed';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <Box h="full" overflowY="auto" p={4}>
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
            Calendars ({calendars.length})
          </Text>
          <HStack>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="xs"
              variant="ghost"
              onClick={fetchCalendars}
              isLoading={isLoading}
            />
          </HStack>
        </HStack>

        {/* New Calendar Input */}
        <HStack>
          <Input
            size="sm"
            placeholder="New calendar name..."
            value={newCalendarName}
            onChange={(e) => setNewCalendarName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createCalendar()}
          />
          <Popover>
            <PopoverTrigger>
              <Box
                w="24px"
                h="24px"
                borderRadius="md"
                bg={newCalendarColor}
                cursor="pointer"
                border="2px solid"
                borderColor={borderColor}
              />
            </PopoverTrigger>
            <PopoverContent w="auto">
              <PopoverBody>
                <SimpleGrid columns={5} spacing={1}>
                  {CALENDAR_COLORS.map((color) => (
                    <Box
                      key={color}
                      w="24px"
                      h="24px"
                      borderRadius="md"
                      bg={color}
                      cursor="pointer"
                      border={newCalendarColor === color ? '2px solid white' : 'none'}
                      boxShadow={newCalendarColor === color ? '0 0 0 2px blue' : 'none'}
                      onClick={() => setNewCalendarColor(color)}
                    />
                  ))}
                </SimpleGrid>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <IconButton
            aria-label="Create calendar"
            icon={<FiPlus />}
            size="sm"
            colorScheme="blue"
            onClick={createCalendar}
            isLoading={isCreatingCalendar}
            isDisabled={!newCalendarName.trim()}
          />
        </HStack>

        <Divider />

        {/* Calendar List by Type */}
        {isLoading ? (
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
            <Text fontSize="sm" color={mutedColor}>Loading calendars...</Text>
          </HStack>
        ) : calendars.length === 0 ? (
          <Text fontSize="sm" color={mutedColor} textAlign="center" py={4}>
            No calendars found. Connect an account or create a local calendar.
          </Text>
        ) : (
          Object.entries(groupedCalendars).map(([type, cals]) => (
            <VStack key={type} align="stretch" spacing={2}>
              <Text fontSize="xs" fontWeight="bold" color={mutedColor}>
                {getTypeLabel(type)}
              </Text>
              {cals.map((calendar) => (
                <Box
                  key={calendar.id}
                  p={2}
                  bg={bgColor}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                >
                  {editingCalendarId === calendar.id ? (
                    // Edit mode
                    <VStack align="stretch" spacing={2}>
                      <HStack>
                        <Input
                          size="sm"
                          value={editingCalendarName}
                          onChange={(e) => setEditingCalendarName(e.target.value)}
                          autoFocus
                        />
                        <Popover>
                          <PopoverTrigger>
                            <Box
                              w="24px"
                              h="24px"
                              borderRadius="md"
                              bg={editingCalendarColor}
                              cursor="pointer"
                              flexShrink={0}
                            />
                          </PopoverTrigger>
                          <PopoverContent w="auto">
                            <PopoverBody>
                              <SimpleGrid columns={5} spacing={1}>
                                {CALENDAR_COLORS.map((color) => (
                                  <Box
                                    key={color}
                                    w="24px"
                                    h="24px"
                                    borderRadius="md"
                                    bg={color}
                                    cursor="pointer"
                                    border={editingCalendarColor === color ? '2px solid white' : 'none'}
                                    boxShadow={editingCalendarColor === color ? '0 0 0 2px blue' : 'none'}
                                    onClick={() => setEditingCalendarColor(color)}
                                  />
                                ))}
                              </SimpleGrid>
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
                      </HStack>
                      <HStack justify="flex-end">
                        <IconButton
                          aria-label="Cancel"
                          icon={<FiX />}
                          size="xs"
                          variant="ghost"
                          onClick={cancelEditingCalendar}
                        />
                        <IconButton
                          aria-label="Save"
                          icon={<FiCheck />}
                          size="xs"
                          colorScheme="green"
                          onClick={saveCalendarEdit}
                          isLoading={isUpdatingCalendar}
                        />
                      </HStack>
                    </VStack>
                  ) : (
                    // View mode
                    <HStack justify="space-between">
                      <HStack flex={1} minW={0}>
                        <Box
                          w="12px"
                          h="12px"
                          borderRadius="sm"
                          bg={calendar.color || 'blue.500'}
                          flexShrink={0}
                        />
                        <Text fontSize="sm" noOfLines={1} flex={1}>
                          {calendar.name}
                        </Text>
                        <IconButton
                          aria-label="Edit calendar"
                          icon={<FiEdit2 />}
                          size="xs"
                          variant="ghost"
                          onClick={() => startEditingCalendar(calendar)}
                        />
                      </HStack>
                      <Switch
                        size="sm"
                        isChecked={calendarSelection.has(calendar.id)}
                        onChange={(e) => handleCalendarToggle(calendar.id, e.target.checked)}
                        colorScheme="green"
                      />
                    </HStack>
                  )}
                </Box>
              ))}
            </VStack>
          ))
        )}
      </VStack>
    </Box>
  );
}
