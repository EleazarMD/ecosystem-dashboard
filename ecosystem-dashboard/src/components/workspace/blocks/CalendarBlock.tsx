/**
 * CalendarBlock - Embeddable calendar block for Notion-style workspace pages
 * 
 * Features:
 * - Inline calendar view in workspace pages
 * - Syncs with Hermes Core calendar data
 * - Supports filtering by calendar
 * - Click to create events
 * - Links events to workspace pages
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  GridItem,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
  Tooltip,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  Select,
  useToast,
} from '@chakra-ui/react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiCalendar,
  FiSettings,
  FiMaximize2,
  FiFilter,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  color: string;
  calendarId: string;
  calendarName?: string;
  location?: string;
  linkedPageId?: string;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  accountType: string;
}

interface CalendarBlockProps {
  blockId: string;
  workspaceId?: string;
  pageId?: string;
  config?: {
    showHeader?: boolean;
    defaultView?: 'month' | 'week';
    filterCalendars?: string[];
    height?: string;
  };
  onEventClick?: (event: CalendarEvent) => void;
  onEventCreate?: (date: string) => void;
  onLinkPage?: (eventId: string, pageId: string) => void;
  isEditable?: boolean;
}

export function CalendarBlock({
  blockId,
  workspaceId,
  pageId,
  config = {},
  onEventClick,
  onEventCreate,
  onLinkPage,
  isEditable = true,
}: CalendarBlockProps) {
  const {
    showHeader = true,
    defaultView = 'month',
    filterCalendars = [],
    height = '400px',
  } = config;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week'>(defaultView);

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCalendar, setNewEventCalendar] = useState('');

  const toast = useToast();
  const borderColor = useSemanticToken('border.default');
  const surfaceBase = useSemanticToken('surface.base');
  const surfaceHover = useSemanticToken('surface.hover');
  const todayBg = useSemanticToken('surface.highlight');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  // Fetch calendars and events from Hermes Core
  const fetchData = useCallback(async () => {
    try {
      const hermesUrl = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8780';

      // Fetch calendars
      const calResponse = await fetch(`${hermesUrl}/v1/calendar/list`);
      if (calResponse.ok) {
        const calData = await calResponse.json();
        const mappedCalendars: Calendar[] = (calData.calendars || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color || '#3B82F6',
          accountType: c.account_type || 'local',
        }));
        setCalendars(mappedCalendars);
        
        // Select all calendars by default if no filter
        if (filterCalendars.length === 0) {
          setSelectedCalendars(new Set(mappedCalendars.map(c => c.id)));
        } else {
          setSelectedCalendars(new Set(filterCalendars));
        }
      }

      // Fetch events
      const evtResponse = await fetch(`${hermesUrl}/v1/calendar/events?days_back=7&days_forward=60`);
      if (evtResponse.ok) {
        const evtData = await evtResponse.json();
        const mappedEvents: CalendarEvent[] = (evtData.events || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.start_time.split('T')[0],
          startTime: e.start_time.split('T')[1]?.substring(0, 5),
          endTime: e.end_time.split('T')[1]?.substring(0, 5),
          color: e.calendar_color || '#3B82F6',
          calendarId: e.calendar_id,
          calendarName: e.calendar_name,
          location: e.location,
        }));
        setEvents(mappedEvents);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCalendars]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get days in month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Fill to 42 cells (6 weeks)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => 
      e.date === dateStr && selectedCalendars.has(e.calendarId)
    );
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (isEditable) {
      setNewEventDate(date.toISOString().split('T')[0]);
      onCreateOpen();
    }
    onEventCreate?.(date.toISOString().split('T')[0]);
  };

  // Create new event
  const handleCreateEvent = async () => {
    if (!newEventTitle.trim()) return;

    try {
      const hermesUrl = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8780';
      const response = await fetch(`${hermesUrl}/v1/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: newEventCalendar || calendars[0]?.id || '21',
          title: newEventTitle,
          start_time: `${newEventDate}T09:00:00`,
          end_time: `${newEventDate}T10:00:00`,
          all_day: false,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Event created',
          description: 'Event will sync to Mac Calendar',
          status: 'success',
          duration: 3000,
        });
        onCreateClose();
        setNewEventTitle('');
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Failed to create event',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const days = getDaysInMonth();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h={height}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
      h={height}
    >
      {/* Header */}
      {showHeader && (
        <HStack
          justify="space-between"
          p={2}
          borderBottom="1px solid"
          borderColor={borderColor}
          bg={surfaceBase}
        >
          <HStack spacing={1}>
            <IconButton
              aria-label="Previous"
              icon={<FiChevronLeft />}
              size="xs"
              variant="ghost"
              onClick={() => navigateMonth('prev')}
            />
            <Text fontSize="sm" fontWeight="600" minW="120px" textAlign="center">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <IconButton
              aria-label="Next"
              icon={<FiChevronRight />}
              size="xs"
              variant="ghost"
              onClick={() => navigateMonth('next')}
            />
            <Button size="xs" variant="ghost" onClick={goToToday}>
              Today
            </Button>
          </HStack>

          <HStack spacing={1}>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Filter calendars"
                icon={<FiFilter />}
                size="xs"
                variant="ghost"
              />
              <MenuList maxH="200px" overflowY="auto">
                {calendars.map((cal) => (
                  <MenuItem
                    key={cal.id}
                    onClick={() => {
                      const newSelected = new Set(selectedCalendars);
                      if (newSelected.has(cal.id)) {
                        newSelected.delete(cal.id);
                      } else {
                        newSelected.add(cal.id);
                      }
                      setSelectedCalendars(newSelected);
                    }}
                  >
                    <HStack>
                      <Box w={3} h={3} borderRadius="full" bg={cal.color} />
                      <Text fontSize="sm">{cal.name}</Text>
                      {selectedCalendars.has(cal.id) && <Text>✓</Text>}
                    </HStack>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
            {isEditable && (
              <IconButton
                aria-label="Add event"
                icon={<FiPlus />}
                size="xs"
                variant="ghost"
                onClick={() => {
                  setNewEventDate(new Date().toISOString().split('T')[0]);
                  onCreateOpen();
                }}
              />
            )}
          </HStack>
        </HStack>
      )}

      {/* Calendar Grid */}
      <Box overflowY="auto" h={showHeader ? `calc(${height} - 45px)` : height}>
        {/* Day headers */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {weekDays.map((day) => (
            <GridItem
              key={day}
              p={1}
              textAlign="center"
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={surfaceBase}
            >
              <Text fontSize="xs" fontWeight="600" color={textSecondary}>
                {day}
              </Text>
            </GridItem>
          ))}
        </Grid>

        {/* Days grid */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {days.map(({ date, isCurrentMonth }, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentDay = isToday(date);

            return (
              <GridItem
                key={index}
                minH="60px"
                p={1}
                border="1px solid"
                borderColor={borderColor}
                bg={isCurrentDay ? todayBg : 'transparent'}
                opacity={isCurrentMonth ? 1 : 0.4}
                cursor={isEditable ? 'pointer' : 'default'}
                _hover={isEditable ? { bg: surfaceHover } : {}}
                onClick={() => handleDateClick(date)}
              >
                <Text
                  fontSize="xs"
                  fontWeight={isCurrentDay ? '700' : '400'}
                  color={isCurrentDay ? 'blue.600' : textPrimary}
                  mb={1}
                >
                  {date.getDate()}
                </Text>
                <VStack spacing={0.5} align="stretch">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Tooltip key={event.id} label={`${event.title}${event.location ? ` • ${event.location}` : ''}`}>
                      <Box
                        px={1}
                        py={0.5}
                        bg={event.color + '30'}
                        borderLeft="2px solid"
                        borderLeftColor={event.color}
                        borderRadius="sm"
                        fontSize="xs"
                        noOfLines={1}
                        cursor="pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      >
                        {event.title}
                      </Box>
                    </Tooltip>
                  ))}
                  {dayEvents.length > 3 && (
                    <Text fontSize="xs" color={textSecondary}>
                      +{dayEvents.length - 3} more
                    </Text>
                  )}
                </VStack>
              </GridItem>
            );
          })}
        </Grid>
      </Box>

      {/* Create Event Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Event</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event title"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Calendar</FormLabel>
                <Select
                  value={newEventCalendar}
                  onChange={(e) => setNewEventCalendar(e.target.value)}
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateEvent}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default CalendarBlock;
