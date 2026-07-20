/**
 * Child Calendar View
 *
 * Displays iCloud-synced calendar events in a kid-friendly format.
 * Shows events for the selected date and upcoming events.
 * Integrates into the planner page alongside local planner items.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  IconButton,
  Tooltip,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiUsers,
  FiCircle,
} from 'react-icons/fi';

interface CalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  calendarType: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  status: string;
  attendees: Array<{ email: string; name?: string; response_status?: string }>;
  source?: string;
}

interface ChildCalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
}

export function ChildCalendarView({ selectedDate }: ChildCalendarViewProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string; color: string }>>([]);

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/child/calendar?action=calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars || []);
      }
    } catch { /* non-fatal */ }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch events for a 7-day window around selected date
      const start = new Date(selectedDate + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

      const res = await fetch(`/api/child/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else if (res.status === 403) {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = () => {
    fetchEvents();
    toast({
      title: '🔄 Refreshed!',
      status: 'info',
      duration: 1500,
    });
  };

  // Group events by all-day vs timed
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events
    .filter((e) => !e.allDay)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <Box bg="white" borderRadius="2xl" boxShadow="md" p={4}>
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FiCalendar color="#8B5CF6" />
            <Text fontWeight="bold" fontSize="sm">My Calendar</Text>
            {events.length > 0 && (
              <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </HStack>
          <HStack spacing={1}>
            {calendars.map((cal) => (
              <Tooltip key={cal.id} label={cal.name} fontSize="xs">
                <Box display="flex" alignItems="center">
                  <FiCircle color={cal.color} size={10} />
                </Box>
              </Tooltip>
            ))}
            <IconButton
              aria-label="Refresh calendar"
              icon={<FiRefreshCw />}
              size="xs"
              variant="ghost"
              onClick={handleRefresh}
              isLoading={loading}
            />
          </HStack>
        </HStack>

        {/* Calendar connection status */}
        {calendars.length === 0 && !loading && (
          <Box p={3} bg="gray.50" borderRadius="lg" textAlign="center">
            <Text fontSize="xs" color="gray.500">
              📅 No calendar connected yet.
              <br />
              Ask a parent to connect your iCloud Calendar!
            </Text>
          </Box>
        )}

        {/* Loading state */}
        {loading ? (
          <VStack py={6} spacing={2}>
            <Spinner size="sm" color="purple.400" />
            <Text fontSize="xs" color="gray.400">Loading events...</Text>
          </VStack>
        ) : events.length === 0 && calendars.length > 0 ? (
          <Box p={4} textAlign="center">
            <Text fontSize="2xl" mb={1}>🌟</Text>
            <Text fontSize="xs" color="gray.500">
              No events for this day!
            </Text>
          </Box>
        ) : (
          <VStack spacing={2} align="stretch">
            {/* All-day events */}
            {allDayEvents.map((event) => (
              <EventCard key={event.id} event={event} isAllDay />
            ))}

            {/* Timed events */}
            {timedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────

function EventCard({ event, isAllDay }: { event: CalendarEvent; isAllDay?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const timeLabel = isAllDay
    ? 'All day'
    : `${formatTime(startTime)} - ${formatTime(endTime)}`;

  return (
    <Box
      p={3}
      borderRadius="lg"
      borderLeft="4px solid"
      borderLeftColor={event.calendarColor}
      bg="gray.50"
      cursor="pointer"
      transition="all 0.15s"
      _hover={{ bg: 'gray.100' }}
      onClick={() => setExpanded(!expanded)}
    >
      <HStack spacing={3} align="start">
        {/* Time/Color indicator */}
        <VStack spacing={0} align="center" flexShrink={0} minW="50px">
          {!isAllDay && (
            <>
              <Text fontSize="xs" fontWeight="bold" color={event.calendarColor}>
                {startTime.toLocaleTimeString('en-US', { hour: 'numeric' })}
              </Text>
              <Text fontSize="2xs" color="gray.400">
                {startTime.toLocaleTimeString('en-US', { minute: '2-digit' }).replace(':00', '')}
              </Text>
            </>
          )}
          {isAllDay && <Text fontSize="xs" color="gray.400">All day</Text>}
        </VStack>

        {/* Content */}
        <VStack align="start" spacing={1} flex={1} overflow="hidden">
          <Text fontWeight="semibold" fontSize="sm" noOfLines={expanded ? undefined : 1}>
            {event.title}
          </Text>

          <HStack spacing={2} flexWrap="wrap">
            <HStack spacing={1}>
              <FiClock size={11} color="gray.400" />
              <Text fontSize="xs" color="gray.500">{timeLabel}</Text>
            </HStack>
            {event.location && (
              <HStack spacing={1}>
                <FiMapPin size={11} color="gray.400" />
                <Text fontSize="xs" color="gray.500" noOfLines={1}>{event.location}</Text>
              </HStack>
            )}
          </HStack>

          {/* Calendar badge */}
          <HStack spacing={1}>
            <Box w={2} h={2} borderRadius="full" bg={event.calendarColor} />
            <Text fontSize="2xs" color="gray.400">{event.calendarName}</Text>
          </HStack>

          {/* Expanded details */}
          {expanded && (
            <VStack align="start" spacing={2} mt={2} w="full">
              {event.description && (
                <Text fontSize="xs" color="gray.600" whiteSpace="pre-wrap">
                  {event.description}
                </Text>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <HStack spacing={1}>
                  <FiUsers size={11} color="gray.400" />
                  <Text fontSize="xs" color="gray.500">
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </Text>
                </HStack>
              )}
            </VStack>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}

export default ChildCalendarView;
