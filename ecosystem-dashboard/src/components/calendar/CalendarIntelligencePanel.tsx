/**
 * Calendar Intelligence Panel
 * Right panel component for calendar page with AI settings and calendar list
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Button,
  Divider,
  Badge,
  Icon,
  Checkbox,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { FiCalendar, FiRefreshCw, FiCheck } from 'react-icons/fi';

interface Calendar {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  source: 'icloud' | 'google' | 'outlook' | 'exchange' | 'caldav' | 'local';
  eventCount?: number;
}

export function CalendarIntelligencePanel() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [emailSync, setEmailSync] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchCalendars();
  }, []);

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      // Use Next.js API route which handles multi-tenant routing
      const response = await fetch('/api/calendar/calendars');
      
      if (response.ok) {
        const data = await response.json();
        // Transform calendar data to our format
        const transformedCalendars = (data.calendars || []).map((cal: any) => ({
          id: cal.id,
          name: cal.name,
          color: cal.color || '#3B82F6',
          enabled: true,
          source: cal.calendar_type || cal.source || 'local',
          eventCount: 0, // Will be populated by events endpoint
        }));
        
        // Fetch event counts for each calendar
        const now = new Date();
        const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        try {
          const eventsResponse = await fetch(
            `/api/calendar/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
          );
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            const events = eventsData.events || [];
            
            // Count events per calendar
            const eventCounts = events.reduce((acc: any, evt: any) => {
              acc[evt.calendar_id] = (acc[evt.calendar_id] || 0) + 1;
              return acc;
            }, {});
            
            transformedCalendars.forEach(cal => {
              cal.eventCount = eventCounts[cal.id] || 0;
            });
          }
        } catch (e) {
          console.warn('Failed to fetch event counts');
        }
        
        setCalendars(transformedCalendars);
      } else {
        throw new Error('Calendar API not available');
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Trigger Mac Agent to sync calendars
      // The Mac Agent runs on Mac Studio and pushes data to Hermes Core
      const macAgentUrl = 'http://100.105.113.118:8781'; // Mac Studio via Tailscale
      
      try {
        const response = await fetch(`${macAgentUrl}/sync/calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            days_back: 7,
            days_forward: 60,
          }),
        });
        
        if (response.ok) {
          toast({
            title: 'Sync triggered',
            description: 'Mac Agent is syncing calendars...',
            status: 'info',
            duration: 2000,
          });
          
          // Wait a bit then refresh
          setTimeout(async () => {
            await fetchCalendars();
            toast({
              title: 'Calendars refreshed',
              description: 'Calendar data updated from Mac Studio',
              status: 'success',
              duration: 3000,
            });
          }, 2000);
        } else {
          throw new Error('Mac Agent not responding');
        }
      } catch (macAgentError) {
        // Fallback: just refresh the data
        toast({
          title: 'Refreshing calendars',
          description: 'Fetching latest calendar data...',
          status: 'info',
          duration: 2000,
        });
        await fetchCalendars();
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not connect to Mac Agent on Mac Studio',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleCalendar = (id: string) => {
    setCalendars(calendars.map(cal => 
      cal.id === id ? { ...cal, enabled: !cal.enabled } : cal
    ));
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      icloud: 'blue',
      google: 'red',
      outlook: 'cyan',
      exchange: 'teal',
      caldav: 'purple',
      local: 'gray',
    };
    return colors[source] || 'gray';
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* AI Settings Section */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={3}>
          Calendar-Aware Intelligence
        </Text>
        
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm">AI Scheduling Assistant</Text>
            <Switch 
              isChecked={aiEnabled} 
              onChange={(e) => setAiEnabled(e.target.checked)}
              colorScheme="blue"
            />
          </HStack>
          
          <HStack justify="space-between">
            <Text fontSize="sm">Email-to-Calendar Sync</Text>
            <Switch 
              isChecked={emailSync} 
              onChange={(e) => setEmailSync(e.target.checked)}
              colorScheme="blue"
            />
          </HStack>
        </VStack>
      </Box>

      <Divider />

      {/* Calendars Section */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontSize="sm" fontWeight="semibold">
            My Calendars
          </Text>
          <Button
            size="xs"
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={handleSync}
            isLoading={syncing}
            variant="ghost"
          >
            Sync
          </Button>
        </HStack>

        {loading ? (
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
          </HStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {calendars.map((calendar) => (
              <HStack
                key={calendar.id}
                p={2}
                borderRadius="md"
                _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
                cursor="pointer"
                onClick={() => toggleCalendar(calendar.id)}
              >
                <Checkbox
                  isChecked={calendar.enabled}
                  colorScheme="blue"
                  onChange={() => toggleCalendar(calendar.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box
                  w={3}
                  h={3}
                  borderRadius="full"
                  bg={calendar.color}
                  flexShrink={0}
                />
                <VStack spacing={0} align="start" flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {calendar.name}
                  </Text>
                  <HStack spacing={2}>
                    <Badge
                      size="sm"
                      colorScheme={getSourceBadge(calendar.source)}
                      fontSize="xs"
                    >
                      {calendar.source}
                    </Badge>
                    {calendar.eventCount !== undefined && (
                      <Text fontSize="xs" color="gray.500">
                        {calendar.eventCount} events
                      </Text>
                    )}
                  </HStack>
                </VStack>
                {calendar.enabled && (
                  <Icon as={FiCheck} color="green.500" />
                )}
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      <Divider />

      {/* Quick Actions */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={3}>
          Quick Actions
        </Text>
        <VStack spacing={2} align="stretch">
          <Button size="sm" variant="outline" leftIcon={<Icon as={FiCalendar} />}>
            Add Calendar
          </Button>
          <Button size="sm" variant="outline">
            Import Events
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
