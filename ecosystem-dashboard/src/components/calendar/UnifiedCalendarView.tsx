/**
 * UnifiedCalendarView - AI Homelab Calendar System
 * 
 * Feature-packed calendar component with:
 * - Multi-calendar aggregation
 * - Month/Week/Day/Agenda views
 * - Apple Calendar sync status
 * - Email extraction notifications
 * - AI-powered scheduling
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRightPanel } from '@/contexts/RightPanelContext';
import {
  Box,
  Grid,
  GridItem,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  IconButton,
  Icon,
  Tooltip,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  InputGroup,
  InputLeftElement,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  Switch,
  Avatar,
  AvatarGroup,
  Flex,
  Spacer,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiMail,
  FiRefreshCw,
  FiSettings,
  FiLink,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiGrid,
  FiList,
  FiSearch,
  FiFilter,
  FiMessageSquare,
} from 'react-icons/fi';
import { 
  SiApple, 
  SiGoogle 
} from 'react-icons/si';

// ============================================
// TYPES
// ============================================

interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name?: string;
  calendar_color?: string;
  calendar_type?: 'personal' | 'work' | 'reference' | string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: 'tentative' | 'confirmed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attendees?: Array<{
    email: string;
    name?: string;
    status: string;
  }>;
  ai_extracted?: boolean;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  calendar_type: string;
  sync_enabled: boolean;
  last_synced_at?: string;
}

interface CalendarStats {
  total_calendars: number;
  total_events: number;
  events_today: number;
  events_this_week: number;
  pending_invites: number;
  synced_accounts: number;
}

interface EmailExtraction {
  id: string;
  email_subject: string;
  extracted_title: string;
  extracted_start_time: string;
  confidence_score: number;
  status: string;
}

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

// ============================================
// MAIN COMPONENT
// ============================================

interface UnifiedCalendarViewProps {
  selectedCalendarIds?: Set<string>;
  onCalendarsLoaded?: (calendars: Calendar[]) => void;
}

export function UnifiedCalendarView({ 
  selectedCalendarIds,
  onCalendarsLoaded,
}: UnifiedCalendarViewProps = {}) {
  // Mobile detection
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;
  
  // Color mode values - must be called at top level
  const viewModeBg = useColorModeValue('gray.100', 'gray.700');
  
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [extractions, setExtractions] = useState<EmailExtraction[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  
  // Use external selection if provided
  const effectiveSelectedCalendars = selectedCalendarIds ?? selectedCalendars;
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, confirmed, tentative, cancelled
  
  // Selected event for AI assistant context
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Event creation state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    all_day: false,
    calendar_id: '',
  });
  
  // Modals
  const { isOpen: isEventModalOpen, onOpen: onEventModalOpen, onClose: onEventModalClose } = useDisclosure();
  
  const toast = useToast();
  
  // Right panel for event details
  const { setActiveTab, setCustomData, setIsOpen } = useRightPanel();
  
  // Handle event click - show details in right panel
  const handleEventClick = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    // Track selected event for AI assistant context
    setSelectedEvent(event);
    setCustomData({ 
      event, 
      type: 'calendar-event',
      onEventUpdated: (updatedEvent: CalendarEvent) => {
        // Update the event in local state
        setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
        setSelectedEvent(updatedEvent);
      },
      onEventDeleted: (eventId: string) => {
        // Remove the event from local state and close panel
        setEvents(prev => prev.filter(ev => ev.id !== eventId));
        setSelectedEvent(null);
        setIsOpen(false);
      }
    });
    setActiveTab('event-details');
    setIsOpen(true);
  }, [setCustomData, setActiveTab, setIsOpen]);
  
  // Refs for auto-scrolling
  const dayViewRef = useRef<HTMLDivElement>(null);
  const weekViewRef = useRef<HTMLDivElement>(null);
  
  // Drag and drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const todayBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Filtered events based on search and filter criteria
  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesLocation = event.location?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }
      
      // Filter by status
      if (filterStatus !== 'all' && event.status !== filterStatus) {
        return false;
      }
      
      // Filter by selected calendars
      if (event.calendar_id && !effectiveSelectedCalendars.has(event.calendar_id)) {
        return false;
      }
      
      return true;
    });
  }, [events, searchQuery, filterStatus, effectiveSelectedCalendars]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars);
        // Select all calendars by default (only if not externally controlled)
        if (!selectedCalendarIds) {
          setSelectedCalendars(new Set(data.calendars.map((c: Calendar) => c.id)));
        }
        // Notify parent of loaded calendars
        if (onCalendarsLoaded) {
          onCalendarsLoaded(data.calendars);
        }
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    }
  }, [selectedCalendarIds, onCalendarsLoaded]);

  const fetchEvents = useCallback(async () => {
    try {
      // Calculate date range based on view mode
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      
      // Reset to start of day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      if (viewMode === 'month') {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
      } else if (viewMode === 'week') {
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        end.setDate(end.getDate() + (6 - day));
      } else if (viewMode === 'agenda') {
        // Agenda shows 30 days ahead
        end.setDate(end.getDate() + 30);
      }
      // Day view uses the default single day range set above
      
      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });
      
      if (effectiveSelectedCalendars.size > 0) {
        params.append('calendar_ids', Array.from(effectiveSelectedCalendars).join(','));
      }
      
      const response = await fetch(`/api/calendar/events?${params}`);
      console.log('[UnifiedCalendarView] Events API response:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[UnifiedCalendarView] Events received:', data.events?.length || 0, data.events);
        setEvents(data.events || []);
      } else {
        console.error('[UnifiedCalendarView] Events API failed:', response.status);
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    }
  }, [currentDate, viewMode, effectiveSelectedCalendars]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchExtractions = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/email-extractions');
      if (response.ok) {
        const data = await response.json();
        setExtractions(data.extractions.filter((e: EmailExtraction) => e.status === 'pending'));
      }
    } catch (error) {
      console.error('Failed to fetch extractions:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCalendars(),
        fetchStats(),
        fetchExtractions(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchCalendars, fetchStats, fetchExtractions]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // Auto-scroll to current time or first event when view changes
  useEffect(() => {
    if (viewMode === 'day' && dayViewRef.current) {
      // Find first event hour or use current hour
      const firstEventHour = events.length > 0 
        ? Math.min(...events.map(e => new Date(e.start_time).getHours()))
        : new Date().getHours();
      // Scroll to that hour (each hour is ~60px)
      const scrollPosition = Math.max(0, (firstEventHour - 1) * 60);
      dayViewRef.current.scrollTop = scrollPosition;
    }
    if (viewMode === 'week' && weekViewRef.current) {
      const firstEventHour = events.length > 0 
        ? Math.min(...events.map(e => new Date(e.start_time).getHours()))
        : new Date().getHours();
      const scrollPosition = Math.max(0, (firstEventHour - 1) * 40);
      weekViewRef.current.scrollTop = scrollPosition;
    }
  }, [viewMode, events]);

  const handleCreateEvent = async () => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      
      if (response.ok) {
        toast({
          title: 'Event created',
          status: 'success',
          duration: 3000,
        });
        onEventModalClose();
        fetchEvents();
        fetchStats();
        setNewEvent({
          title: '',
          description: '',
          location: '',
          start_time: '',
          end_time: '',
          all_day: false,
          calendar_id: '',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to create event',
          description: error.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create event',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleAcceptExtraction = async (id: string) => {
    try {
      const response = await fetch(`/api/calendar/email-extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      
      if (response.ok) {
        toast({
          title: 'Event created from email',
          status: 'success',
          duration: 3000,
        });
        fetchExtractions();
        fetchEvents();
      }
    } catch (error) {
      toast({
        title: 'Failed to accept extraction',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleRejectExtraction = async (id: string) => {
    try {
      const response = await fetch(`/api/calendar/email-extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      
      if (response.ok) {
        fetchExtractions();
      }
    } catch (error) {
      console.error('Failed to reject extraction:', error);
    }
  };

  // ============================================
  // DRAG AND DROP HANDLERS
  // ============================================

  const handleDragStart = useCallback((event: CalendarEvent, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedEvent(event);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (targetDate: Date, targetHour: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedEvent) return;

    // Calculate new start and end times
    const originalStart = new Date(draggedEvent.start_time);
    const originalEnd = new Date(draggedEvent.end_time);
    const duration = originalEnd.getTime() - originalStart.getTime();

    const newStart = new Date(targetDate);
    newStart.setHours(targetHour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    // Optimistically update UI
    setEvents(prev => prev.map(ev => 
      ev.id === draggedEvent.id 
        ? { ...ev, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
        : ev
    ));

    try {
      const response = await fetch(`/api/calendar/events/${draggedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Event rescheduled',
          description: `Moved to ${newStart.toLocaleString(undefined, { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}`,
          status: 'success',
          duration: 3000,
        });
      } else {
        // Revert on failure
        setEvents(prev => prev.map(ev => 
          ev.id === draggedEvent.id ? draggedEvent : ev
        ));
        const error = await response.json();
        toast({
          title: 'Failed to reschedule',
          description: error.error || 'Please try again',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      // Revert on error
      setEvents(prev => prev.map(ev => 
        ev.id === draggedEvent.id ? draggedEvent : ev
      ));
      toast({
        title: 'Error rescheduling event',
        status: 'error',
        duration: 5000,
      });
    }

    setDraggedEvent(null);
    setIsDragging(false);
  }, [draggedEvent, toast]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Get sync accounts and trigger sync
      const accountsResponse = await fetch('/api/calendar/sync/apple');
      if (accountsResponse.ok) {
        const data = await accountsResponse.json();
        if (data.accounts.length > 0) {
          await fetch('/api/calendar/sync/apple', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: data.accounts[0].id }),
          });
        }
      }
      
      toast({
        title: 'Sync complete',
        status: 'success',
        duration: 3000,
      });
      
      fetchEvents();
      fetchStats();
    } catch (error) {
      toast({
        title: 'Sync failed',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ============================================
  // CALENDAR GRID HELPERS
  // ============================================

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
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
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      {/* Header */}
      <VStack mb={4} align="stretch" spacing={2}>
        {/* Navigation row */}
        <HStack justify="space-between">
          <HStack spacing={1}>
            <IconButton
              aria-label="Previous"
              icon={<FiChevronLeft />}
              onClick={() => navigateDate('prev')}
              size="sm"
              variant="ghost"
            />
            <Text fontSize={isMobile ? "md" : "xl"} fontWeight="bold" textAlign="center">
              {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {viewMode === 'week' && (() => {
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                if (weekStart.getMonth() === weekEnd.getMonth()) {
                  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.getDate()}`;
                }
                return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              })()}
              {viewMode === 'day' && currentDate.toLocaleDateString('en-US', isMobile ? { month: 'short', day: 'numeric' } : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {viewMode === 'agenda' && currentDate.toLocaleDateString('en-US', isMobile ? { month: 'short', day: 'numeric' } : { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <IconButton
              aria-label="Next"
              icon={<FiChevronRight />}
              onClick={() => navigateDate('next')}
              size="sm"
              variant="ghost"
            />
            <Button size="sm" variant="ghost" onClick={goToToday}>
              Today
            </Button>
          </HStack>
          
          {/* Add event button */}
          <Button
            leftIcon={isMobile ? undefined : <FiPlus />}
            colorScheme="blue"
            size="sm"
            onClick={onEventModalOpen}
          >
            {isMobile ? <Icon as={FiPlus} /> : 'Add Event'}
          </Button>
        </HStack>
        
        {/* Controls row */}
        <HStack justify="space-between" wrap="wrap" gap={2}>
          {/* View mode selector */}
          <HStack spacing={1} bg={viewModeBg} p={1} borderRadius="md">
            {(isMobile ? ['month', 'day', 'agenda'] as ViewMode[] : ['month', 'week', 'day', 'agenda'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                size="xs"
                variant={viewMode === mode ? 'solid' : 'ghost'}
                colorScheme={viewMode === mode ? 'blue' : undefined}
                onClick={() => setViewMode(mode)}
                textTransform="capitalize"
              >
                {mode}
              </Button>
            ))}
          </HStack>
          
          <HStack spacing={1}>
            {/* Search toggle */}
            <IconButton
              aria-label="Search"
              icon={<FiSearch />}
              size="sm"
              variant={showSearch ? 'solid' : 'ghost'}
              colorScheme={showSearch ? 'blue' : undefined}
              onClick={() => setShowSearch(!showSearch)}
            />
            
            {/* Filter dropdown */}
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Filter"
                icon={<FiFilter />}
                size="sm"
                variant={filterStatus !== 'all' ? 'solid' : 'ghost'}
                colorScheme={filterStatus !== 'all' ? 'blue' : undefined}
              />
              <MenuList>
                <MenuItem onClick={() => setFilterStatus('all')}>
                  All Events {filterStatus === 'all' && '✓'}
                </MenuItem>
                <MenuDivider />
                <MenuItem onClick={() => setFilterStatus('confirmed')}>
                  Confirmed {filterStatus === 'confirmed' && '✓'}
                </MenuItem>
                <MenuItem onClick={() => setFilterStatus('tentative')}>
                  Tentative {filterStatus === 'tentative' && '✓'}
                </MenuItem>
                <MenuItem onClick={() => setFilterStatus('cancelled')}>
                  Cancelled {filterStatus === 'cancelled' && '✓'}
                </MenuItem>
              </MenuList>
            </Menu>
            
            {/* Email extractions badge */}
            {extractions.length > 0 && (
              <Button
                size="sm"
                leftIcon={isMobile ? undefined : <FiMail />}
                colorScheme="orange"
                variant="outline"
                onClick={() => {
                  setCustomData({
                    extractions,
                    onAccept: handleAcceptExtraction,
                    onReject: handleRejectExtraction,
                    onRefresh: fetchExtractions,
                  });
                  setActiveTab('email-extractions');
                  setIsOpen(true);
                }}
              >
                {isMobile ? <Icon as={FiMail} /> : extractions.length}
              </Button>
            )}
            
            {/* Sync button */}
            <IconButton
              aria-label="Sync"
              icon={<FiRefreshCw />}
              onClick={handleSync}
              isLoading={syncing}
              size="sm"
              variant="ghost"
            />
            
            {/* AI Assistant */}
            <Tooltip label="AI Calendar Assistant">
              <IconButton
                aria-label="AI Assistant"
                icon={<FiMessageSquare />}
                onClick={() => {
                  setCustomData({ 
                    calendarContext: {
                      selectedEvent: selectedEvent ? {
                        id: selectedEvent.id,
                        title: selectedEvent.title,
                        start_time: selectedEvent.start_time,
                        end_time: selectedEvent.end_time,
                        calendar_name: selectedEvent.calendar_name,
                      } : undefined,
                      currentDate,
                      viewMode,
                      todayEventCount: filteredEvents.filter(e => 
                        new Date(e.start_time).toDateString() === new Date().toDateString()
                      ).length,
                      visibleEvents: filteredEvents.slice(0, 50).map(e => ({
                        id: e.id,
                        title: e.title,
                        start_time: e.start_time,
                        end_time: e.end_time,
                        calendar_name: e.calendar_name,
                        calendar_id: e.calendar_id,
                        location: e.location,
                      })),
                    },
                    onEventUpdated: (updatedEvent: CalendarEvent) => {
                      setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
                    },
                    onEventDeleted: (eventId: string) => {
                      setEvents(prev => prev.filter(ev => ev.id !== eventId));
                      setSelectedEvent(null);
                    },
                  });
                  setActiveTab('calendar-assistant');
                  setIsOpen(true);
                }}
                size="sm"
                variant="ghost"
                colorScheme="blue"
              />
            </Tooltip>
            
            {/* Settings */}
            <IconButton
              aria-label="Settings"
              icon={<FiSettings />}
              onClick={() => {
                setCustomData({ 
                  calendars, 
                  selectedCalendars,
                  onCalendarToggle: (calendarId: string, enabled: boolean) => {
                    const newSelected = new Set(selectedCalendars);
                    if (enabled) {
                      newSelected.add(calendarId);
                    } else {
                      newSelected.delete(calendarId);
                    }
                    setSelectedCalendars(newSelected);
                  }
                });
                setActiveTab('ai-settings');
                setIsOpen(true);
              }}
              size="sm"
              variant="ghost"
            />
          </HStack>
        </HStack>
      </VStack>

      {/* Search bar */}
      {showSearch && (
        <Box mb={4}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search events by title, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg={bgColor}
              borderColor={borderColor}
            />
          </InputGroup>
          {searchQuery && (
            <HStack mt={2} fontSize="xs" color="gray.500">
              <Text>
                Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </Text>
              <Button size="xs" variant="ghost" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            </HStack>
          )}
        </Box>
      )}

      {/* Stats bar */}
      {stats && (
        <HStack mb={4} spacing={4} fontSize="sm" color="gray.500">
          <Text>{stats.events_today} today</Text>
          <Text>{stats.events_this_week} this week</Text>
          {stats.pending_invites > 0 && (
            <Badge colorScheme="orange">{stats.pending_invites} pending invites</Badge>
          )}
          {stats.synced_accounts > 0 && (
            <HStack>
              <Icon as={SiApple} />
              <Text>Synced</Text>
            </HStack>
          )}
        </HStack>
      )}

      {/* Calendar Grid - Desktop */}
      {viewMode === 'month' && !isMobile && (
        <Box>
          {/* Week day headers */}
          <Grid templateColumns="repeat(7, 1fr)" gap={0} mb={1}>
            {weekDays.map((day) => (
              <GridItem key={day} textAlign="center" py={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.500">
                  {day}
                </Text>
              </GridItem>
            ))}
          </Grid>
          
          {/* Calendar days */}
          <Grid templateColumns="repeat(7, 1fr)" gap={0}>
            {days.map(({ date, isCurrentMonth }, index) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentDay = isToday(date);
              
              return (
                <GridItem
                  key={index}
                  minH="100px"
                  p={1}
                  border="1px solid"
                  borderColor={borderColor}
                  bg={isCurrentDay ? todayBg : bgColor}
                  opacity={isCurrentMonth ? 1 : 0.5}
                  _hover={{ bg: hoverBg }}
                  cursor="pointer"
                  onClick={() => {
                    setNewEvent(prev => ({
                      ...prev,
                      start_time: date.toISOString().slice(0, 16),
                      end_time: new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
                    }));
                    onEventModalOpen();
                  }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={isCurrentDay ? 'bold' : 'normal'}
                    color={isCurrentDay ? 'blue.500' : undefined}
                    mb={1}
                  >
                    {date.getDate()}
                  </Text>
                  
                  <VStack align="stretch" spacing={1}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <Box
                        key={event.id}
                        bg={event.calendar_color || 'blue.500'}
                        color="white"
                        px={1}
                        py={0.5}
                        borderRadius="sm"
                        fontSize="xs"
                        noOfLines={1}
                        onClick={(e) => handleEventClick(event, e)}
                        cursor="pointer"
                        _hover={{ opacity: 0.8 }}
                      >
                        {event.ai_extracted && (
                          <Icon as={FiMail} mr={1} boxSize={3} />
                        )}
                        {event.title}
                      </Box>
                    ))}
                    {dayEvents.length > 3 && (
                      <Text fontSize="xs" color="gray.500">
                        +{dayEvents.length - 3} more
                      </Text>
                    )}
                  </VStack>
                </GridItem>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Calendar Grid - Mobile (compact) */}
      {viewMode === 'month' && isMobile && (
        <Box>
          {/* Week day headers - abbreviated */}
          <Grid templateColumns="repeat(7, 1fr)" gap={0} mb={1}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <GridItem key={i} textAlign="center" py={1}>
                <Text fontSize="xs" fontWeight="medium" color="gray.500">
                  {day}
                </Text>
              </GridItem>
            ))}
          </Grid>
          
          {/* Calendar days - compact */}
          <Grid templateColumns="repeat(7, 1fr)" gap={0}>
            {days.map(({ date, isCurrentMonth }, index) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentDay = isToday(date);
              const hasEvents = dayEvents.length > 0;
              
              return (
                <GridItem
                  key={index}
                  h="44px"
                  p={0.5}
                  border="1px solid"
                  borderColor={borderColor}
                  bg={isCurrentDay ? todayBg : bgColor}
                  opacity={isCurrentMonth ? 1 : 0.4}
                  cursor="pointer"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => {
                    // On mobile, tapping a day switches to day view for that date
                    setCurrentDate(date);
                    setViewMode('day');
                  }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={isCurrentDay ? 'bold' : 'normal'}
                    color={isCurrentDay ? 'blue.500' : undefined}
                  >
                    {date.getDate()}
                  </Text>
                  
                  {/* Event indicators - dots */}
                  {hasEvents && (
                    <HStack spacing={0.5} mt={0.5}>
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <Box
                          key={i}
                          w="5px"
                          h="5px"
                          borderRadius="full"
                          bg={event.calendar_color || 'blue.500'}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <Text fontSize="8px" color="gray.500">+</Text>
                      )}
                    </HStack>
                  )}
                </GridItem>
              );
            })}
          </Grid>
          
          {/* Events for selected date shown below */}
          <Box mt={4}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <VStack align="stretch" spacing={2}>
              {getEventsForDate(currentDate).length === 0 ? (
                <Text fontSize="sm" color="gray.500">No events</Text>
              ) : (
                getEventsForDate(currentDate).map((event) => (
                  <HStack
                    key={event.id}
                    p={2}
                    bg={bgColor}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderLeftColor={event.calendar_color || 'blue.500'}
                    onClick={(e) => handleEventClick(event, e)}
                    cursor="pointer"
                  >
                    <VStack align="start" spacing={0} flex={1}>
                      <HStack spacing={1}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{event.title}</Text>
                        {event.calendar_type === 'work' && (
                          <Badge colorScheme="blue" size="sm" fontSize="9px" px={1}>W</Badge>
                        )}
                      </HStack>
                      <HStack fontSize="xs" color="gray.500" spacing={2}>
                        <Text>
                          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {event.calendar_name && (
                          <Text noOfLines={1}>• {event.calendar_name}</Text>
                        )}
                      </HStack>
                    </VStack>
                  </HStack>
                ))
              )}
            </VStack>
          </Box>
        </Box>
      )}

      {/* Week View - Hidden on mobile */}
      {viewMode === 'week' && !isMobile && (
        <Box>
          {/* Week day headers with dates */}
          <Grid templateColumns="60px repeat(7, 1fr)" gap={0} mb={1}>
            <GridItem /> {/* Empty corner */}
            {(() => {
              const weekStart = new Date(currentDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              return Array.from({ length: 7 }, (_, i) => {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + i);
                const isCurrentDay = isToday(day);
                return (
                  <GridItem key={i} textAlign="center" py={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.500">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text 
                      fontSize="lg" 
                      fontWeight={isCurrentDay ? 'bold' : 'normal'}
                      color={isCurrentDay ? 'blue.500' : undefined}
                      bg={isCurrentDay ? 'blue.100' : undefined}
                      borderRadius="full"
                      w="32px"
                      h="32px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mx="auto"
                    >
                      {day.getDate()}
                    </Text>
                  </GridItem>
                );
              });
            })()}
          </Grid>
          
          {/* Time slots */}
          <Box ref={weekViewRef} maxH="600px" overflowY="auto">
            {Array.from({ length: 24 }, (_, hour) => {
              const weekStart = new Date(currentDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              
              return (
                <Grid key={hour} templateColumns="60px repeat(7, 1fr)" gap={0}>
                  <GridItem 
                    py={2} 
                    pr={2} 
                    textAlign="right" 
                    fontSize="xs" 
                    color="gray.500"
                    borderTop="1px solid"
                    borderColor={borderColor}
                  >
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </GridItem>
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const day = new Date(weekStart);
                    day.setDate(day.getDate() + dayIndex);
                    day.setHours(hour, 0, 0, 0);
                    
                    const hourEvents = filteredEvents.filter(event => {
                      const eventStart = new Date(event.start_time);
                      return eventStart.toDateString() === day.toDateString() && 
                             eventStart.getHours() === hour;
                    });
                    
                    return (
                      <GridItem
                        key={dayIndex}
                        minH="40px"
                        borderTop="1px solid"
                        borderLeft="1px solid"
                        borderColor={isDragging ? 'blue.300' : borderColor}
                        bg={isToday(day) ? todayBg : bgColor}
                        _hover={{ bg: hoverBg }}
                        cursor="pointer"
                        p={0.5}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(day, hour, e)}
                        onClick={() => {
                          setNewEvent(prev => ({
                            ...prev,
                            start_time: day.toISOString().slice(0, 16),
                            end_time: new Date(day.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
                          }));
                          onEventModalOpen();
                        }}
                      >
                        {hourEvents.map(event => (
                          <Box
                            key={event.id}
                            bg={event.calendar_color || 'blue.500'}
                            color="white"
                            px={1}
                            py={0.5}
                            borderRadius="sm"
                            fontSize="xs"
                            noOfLines={1}
                            mb={0.5}
                            draggable
                            onDragStart={(e) => handleDragStart(event, e)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => handleEventClick(event, e)}
                            cursor="grab"
                            _hover={{ opacity: 0.8 }}
                            _active={{ cursor: 'grabbing' }}
                          >
                            {event.title}
                          </Box>
                        ))}
                      </GridItem>
                    );
                  })}
                </Grid>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Box>
          <Box ref={dayViewRef} maxH={isMobile ? "calc(100vh - 220px)" : "600px"} overflowY="auto">
            {Array.from({ length: 24 }, (_, hour) => {
              const dayDate = new Date(currentDate);
              dayDate.setHours(hour, 0, 0, 0);
              
              const hourEvents = filteredEvents.filter(event => {
                const eventStart = new Date(event.start_time);
                return eventStart.toDateString() === currentDate.toDateString() && 
                       eventStart.getHours() === hour;
              });
              
              return (
                <Grid key={hour} templateColumns={isMobile ? "50px 1fr" : "80px 1fr"} gap={0}>
                  <GridItem 
                    py={3} 
                    pr={3} 
                    textAlign="right" 
                    fontSize="sm" 
                    color="gray.500"
                    borderTop="1px solid"
                    borderColor={borderColor}
                  >
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </GridItem>
                  <GridItem
                    minH="60px"
                    borderTop="1px solid"
                    borderColor={isDragging ? 'blue.300' : borderColor}
                    bg={bgColor}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    p={1}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(currentDate, hour, e)}
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        start_time: dayDate.toISOString().slice(0, 16),
                        end_time: new Date(dayDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
                      }));
                      onEventModalOpen();
                    }}
                  >
                    <VStack align="stretch" spacing={1}>
                      {hourEvents.map(event => (
                        <HStack
                          key={event.id}
                          bg={event.calendar_color || 'blue.500'}
                          color="white"
                          px={2}
                          py={1}
                          borderRadius="md"
                          fontSize="sm"
                          draggable
                          onDragStart={(e) => handleDragStart(event, e)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => handleEventClick(event, e)}
                          cursor="grab"
                          _hover={{ opacity: 0.8 }}
                          _active={{ cursor: 'grabbing' }}
                        >
                          <VStack align="start" spacing={0} flex={1}>
                            <HStack spacing={1}>
                              <Text fontWeight="medium" noOfLines={1}>{event.title}</Text>
                              {event.calendar_type === 'work' && (
                                <Badge colorScheme="whiteAlpha" size="sm" fontSize="9px" px={1}>W</Badge>
                              )}
                            </HStack>
                            {event.calendar_name && (
                              <Text fontSize="xs" opacity={0.8} noOfLines={1}>{event.calendar_name}</Text>
                            )}
                          </VStack>
                          <Text fontSize="xs">
                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </GridItem>
                </Grid>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Agenda View - Redesigned */}
      {viewMode === 'agenda' && (
        <Box>
          {filteredEvents.length === 0 ? (
            <VStack py={12} spacing={4}>
              <Icon as={FiCalendar} boxSize={12} color="gray.300" />
              <Text color="gray.500" textAlign="center" fontSize="lg">
                {searchQuery ? 'No events match your search' : 'No events scheduled'}
              </Text>
              <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={onEventModalOpen}>
                Add Event
              </Button>
            </VStack>
          ) : (
            (() => {
              // Group events by date
              const sortedEvents = [...filteredEvents].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
              );
              const groupedByDate: Record<string, CalendarEvent[]> = {};
              sortedEvents.forEach((event) => {
                const dateKey = new Date(event.start_time).toDateString();
                if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
                groupedByDate[dateKey].push(event);
              });

              const today = new Date().toDateString();
              const tomorrow = new Date(Date.now() + 86400000).toDateString();

              return (
                <VStack align="stretch" spacing={0}>
                  {Object.entries(groupedByDate).map(([dateKey, dayEvents], groupIndex) => {
                    const date = new Date(dateKey);
                    const isToday = dateKey === today;
                    const isTomorrow = dateKey === tomorrow;
                    const isPast = date < new Date(today);
                    
                    // Calculate total hours for the day
                    const totalMinutes = dayEvents.reduce((acc, ev) => {
                      const start = new Date(ev.start_time).getTime();
                      const end = new Date(ev.end_time).getTime();
                      return acc + (end - start) / 60000;
                    }, 0);
                    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

                    return (
                      <Box key={dateKey} mb={4}>
                        {/* Date Header */}
                        <HStack
                          px={4}
                          py={3}
                          bg={isToday ? 'blue.50' : 'gray.50'}
                          _dark={{ bg: isToday ? 'blue.900' : 'gray.700' }}
                          borderRadius="lg"
                          mb={2}
                          position="sticky"
                          top={0}
                          zIndex={5}
                        >
                          <VStack align="start" spacing={0} flex={1}>
                            <HStack spacing={2}>
                              <Text
                                fontWeight="bold"
                                fontSize="lg"
                                color={isToday ? 'blue.600' : isPast ? 'gray.400' : 'gray.700'}
                                _dark={{ color: isToday ? 'blue.300' : isPast ? 'gray.500' : 'gray.200' }}
                              >
                                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString([], { weekday: 'long' })}
                              </Text>
                              {isToday && (
                                <Badge colorScheme="blue" variant="solid" fontSize="xs">
                                  NOW
                                </Badge>
                              )}
                            </HStack>
                            <Text fontSize="sm" color="gray.500">
                              {date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </VStack>
                          <VStack align="end" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.300' }}>
                              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              {totalHours}h scheduled
                            </Text>
                          </VStack>
                        </HStack>

                        {/* Events for this day */}
                        <VStack align="stretch" spacing={2} pl={2}>
                          {dayEvents.map((event, eventIndex) => {
                            const startTime = new Date(event.start_time);
                            const endTime = new Date(event.end_time);
                            const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                            const durationStr = duration >= 60 
                              ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? `${duration % 60}m` : ''}`
                              : `${duration}m`;
                            const isNow = new Date() >= startTime && new Date() <= endTime;
                            const isPastEvent = endTime < new Date();
                            const isVideoMeeting = event.location?.toLowerCase().includes('zoom') || 
                                                   event.location?.toLowerCase().includes('meet.google') ||
                                                   event.location?.toLowerCase().includes('teams');

                            return (
                              <Box
                                key={event.id}
                                position="relative"
                                pl={4}
                                _before={{
                                  content: '""',
                                  position: 'absolute',
                                  left: '6px',
                                  top: eventIndex === 0 ? '50%' : 0,
                                  bottom: eventIndex === dayEvents.length - 1 ? '50%' : 0,
                                  width: '2px',
                                  bg: 'gray.200',
                                  _dark: { bg: 'gray.600' },
                                }}
                              >
                                {/* Timeline dot */}
                                <Box
                                  position="absolute"
                                  left="2px"
                                  top="50%"
                                  transform="translateY(-50%)"
                                  w={isNow ? '12px' : '10px'}
                                  h={isNow ? '12px' : '10px'}
                                  borderRadius="full"
                                  bg={isNow ? 'green.500' : event.calendar_color || 'blue.500'}
                                  border="2px solid"
                                  borderColor={bgColor}
                                  zIndex={1}
                                  boxShadow={isNow ? '0 0 0 3px rgba(72, 187, 120, 0.3)' : 'none'}
                                />

                                {/* Event Card */}
                                <Box
                                  ml={4}
                                  p={4}
                                  bg={bgColor}
                                  border="1px solid"
                                  borderColor={isNow ? 'green.300' : borderColor}
                                  borderRadius="xl"
                                  cursor="pointer"
                                  transition="all 0.2s"
                                  opacity={isPastEvent ? 0.6 : 1}
                                  _hover={{ 
                                    transform: 'translateX(4px)',
                                    shadow: 'md',
                                    borderColor: event.calendar_color || 'blue.300',
                                  }}
                                  onClick={(e) => handleEventClick(event, e)}
                                >
                                  <HStack justify="space-between" align="start" mb={2}>
                                    <VStack align="start" spacing={1} flex={1}>
                                      <HStack spacing={2} flexWrap="wrap">
                                        <Text 
                                          fontWeight="semibold" 
                                          fontSize="md"
                                          textDecoration={event.status === 'cancelled' ? 'line-through' : 'none'}
                                          color={isPastEvent ? 'gray.500' : undefined}
                                        >
                                          {event.title}
                                        </Text>
                                        {isNow && (
                                          <Badge colorScheme="green" variant="solid" fontSize="xs" animation="pulse 2s infinite">
                                            In Progress
                                          </Badge>
                                        )}
                                        {event.status === 'tentative' && (
                                          <Badge colorScheme="yellow" variant="subtle" fontSize="xs">
                                            Tentative
                                          </Badge>
                                        )}
                                        {event.status === 'cancelled' && (
                                          <Badge colorScheme="red" variant="subtle" fontSize="xs">
                                            Cancelled
                                          </Badge>
                                        )}
                                        {event.ai_extracted && (
                                          <Tooltip label="Extracted from email">
                                            <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                                              <Icon as={FiMail} boxSize={3} mr={1} />
                                              AI
                                            </Badge>
                                          </Tooltip>
                                        )}
                                      </HStack>
                                      
                                      {/* Time and Duration */}
                                      <HStack spacing={3} fontSize="sm" color="gray.500">
                                        <HStack spacing={1}>
                                          <Icon as={FiClock} boxSize={3.5} />
                                          <Text fontWeight="medium">
                                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' - '}
                                            {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </Text>
                                        </HStack>
                                        <Text color="gray.400">•</Text>
                                        <Text>{durationStr}</Text>
                                      </HStack>
                                    </VStack>

                                    {/* Calendar Color Indicator */}
                                    <Box
                                      w={3}
                                      h={3}
                                      borderRadius="full"
                                      bg={event.calendar_color || 'blue.500'}
                                      flexShrink={0}
                                    />
                                  </HStack>

                                  {/* Location */}
                                  {event.location && (
                                    <HStack 
                                      fontSize="sm" 
                                      color="gray.500" 
                                      mt={2}
                                      p={2}
                                      bg={isVideoMeeting ? 'blue.50' : 'gray.50'}
                                      _dark={{ bg: isVideoMeeting ? 'blue.900' : 'gray.700' }}
                                      borderRadius="md"
                                    >
                                      <Icon as={isVideoMeeting ? FiLink : FiMapPin} boxSize={3.5} color={isVideoMeeting ? 'blue.500' : undefined} />
                                      <Text noOfLines={1} flex={1}>{event.location}</Text>
                                      {isVideoMeeting && (
                                        <Button
                                          size="xs"
                                          colorScheme="blue"
                                          variant="solid"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(event.location, '_blank');
                                          }}
                                        >
                                          Join
                                        </Button>
                                      )}
                                    </HStack>
                                  )}

                                  {/* Footer: Calendar name and Attendees */}
                                  <HStack mt={3} justify="space-between" align="center">
                                    <HStack spacing={2} fontSize="xs" color="gray.400">
                                      <Box w={2} h={2} borderRadius="full" bg={event.calendar_color || 'blue.500'} />
                                      <Text>{event.calendar_name || 'Calendar'}</Text>
                                    </HStack>
                                    
                                    {event.attendees && event.attendees.length > 0 && (
                                      <HStack spacing={1}>
                                        <AvatarGroup size="xs" max={4} spacing={-1}>
                                          {event.attendees.map((attendee, i) => (
                                            <Tooltip key={i} label={attendee.name || attendee.email} placement="top">
                                              <Avatar 
                                                name={attendee.name || attendee.email} 
                                                size="xs"
                                                borderWidth={2}
                                                borderColor={
                                                  attendee.status === 'accepted' ? 'green.400' :
                                                  attendee.status === 'declined' ? 'red.400' :
                                                  attendee.status === 'tentative' ? 'yellow.400' : 'gray.300'
                                                }
                                              />
                                            </Tooltip>
                                          ))}
                                        </AvatarGroup>
                                        <Text fontSize="xs" color="gray.400">
                                          +{event.attendees.length}
                                        </Text>
                                      </HStack>
                                    )}
                                  </HStack>
                                </Box>
                              </Box>
                            );
                          })}
                        </VStack>
                      </Box>
                    );
                  })}
                </VStack>
              );
            })()
          )}
        </Box>
      )}

      {/* Create Event Modal */}
      <Modal isOpen={isEventModalOpen} onClose={onEventModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Event</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                />
              </FormControl>
              
              <HStack w="full">
                <FormControl isRequired>
                  <FormLabel>Start</FormLabel>
                  <Input
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>End</FormLabel>
                  <Input
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </FormControl>
              </HStack>
              
              <FormControl>
                <FormLabel>Calendar</FormLabel>
                <Select
                  value={newEvent.calendar_id}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, calendar_id: e.target.value }))}
                  placeholder="Select calendar"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Location</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiMapPin} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    value={newEvent.location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Add location"
                  />
                </InputGroup>
              </FormControl>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add description"
                  rows={3}
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>All day event</FormLabel>
                <Switch
                  isChecked={newEvent.all_day}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, all_day: e.target.checked }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEventModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateEvent}
              isDisabled={!newEvent.title || !newEvent.start_time || !newEvent.end_time}
            >
              Create Event
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}

export default UnifiedCalendarView;
