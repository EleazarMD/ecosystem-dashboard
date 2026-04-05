/**
 * CalendarGridView - Notion-style calendar grid view
 * Monthly/weekly calendar with events displayed on dates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
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
  ModalCloseButton,
  Input,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Portal,
} from '@chakra-ui/react';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus,
  FiEdit2,
  FiCopy,
  FiTrash2,
  FiExternalLink,
  FiLink,
  FiCalendar
} from 'react-icons/fi';
import { PropertyCommandMenu } from './PropertyCommandMenu';
import { useAddPropertyButton } from '@/hooks/usePropertyCommand';
import { PropertyDefinition, PropertyType } from '@/lib/property-registry';
import { PropertyField } from './PropertyField';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  tags?: string[];
  status?: string;
  properties?: Record<string, any>;
}

interface CalendarGridViewProps {
  databaseId: string;
  onEventClick: (eventId: string) => void;
  viewMode?: 'month' | 'week';
}

export function CalendarGridView({ 
  databaseId, 
  onEventClick,
  viewMode = 'month' 
}: CalendarGridViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [contextMenuDate, setContextMenuDate] = useState<Date | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [eventProperties, setEventProperties] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isContextMenuOpen, 
    onOpen: onContextMenuOpen, 
    onClose: onContextMenuClose 
  } = useDisclosure();
  const toast = useToast();
  
  // Property system integration
  const addProperty = useAddPropertyButton(
    (property: PropertyDefinition) => {
      const newProperty = {
        id: `prop-${Date.now()}`,
        name: property.name,
        type: property.type,
        icon: property.icon,
        value: null,
        options: property.config?.hasOptions ? [] : undefined,
      };
      setEventProperties([...eventProperties, newProperty]);
    },
    {
      view: 'calendar',
      hasDatabase: false,
    }
  );
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const todayBg = useSemanticToken('surface.highlight');
  const selectedBg = useSemanticToken('surface.hover');
  const eventBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const headerBg = useSemanticToken('surface.base');

  useEffect(() => {
    loadEvents();
  }, [databaseId, currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks/${databaseId}`);
      
      if (response.ok) {
        const data = await response.json();
        const entries = data.children || [];
        
        const calendarEvents: CalendarEvent[] = entries.map((entry: any) => ({
          id: entry.id,
          title: entry.properties?.Name?.[0]?.text?.content || 'Untitled',
          date: entry.properties?.Date?.date?.start || new Date().toISOString().split('T')[0],
          tags: entry.properties?.Tags?.multi_select?.map((t: any) => t.name) || [],
          status: entry.properties?.Status?.select?.name || 'Planned',
          properties: entry.properties
        }));
        
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEventProperties([]); // Reset properties
    setNewEventTitle(''); // Reset title
    setCommentText(''); // Reset comment
    onOpen();
  };
  
  const handleCloseModal = () => {
    setEventProperties([]);
    setNewEventTitle('');
    setCommentText('');
    onClose();
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return;

    try {
      const workspaceId = 'ws-001';
      const response = await fetch(`/api/workspace/${workspaceId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page',
          parent_id: databaseId,
          properties: {
            Name: [{
              type: 'text',
              text: { content: newEventTitle }
            }],
            Date: {
              type: 'date',
              date: { start: selectedDate.toISOString().split('T')[0] }
            }
          },
          created_by: 'eleazar'
        })
      });

      if (response.ok) {
        toast({
          title: 'Event created',
          description: `Created with ${eventProperties.length} properties`,
          status: 'success',
          duration: 2000,
        });
        handleCloseModal();
        await loadEvents();
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: 'Failed to create event',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const today = new Date();
    const isToday = (day: number) => {
      return today.getDate() === day && 
             today.getMonth() === month && 
             today.getFullYear() === year;
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Box key={`empty-${i}`} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(date);
      const isTodayDate = isToday(day);
      const isHovered = hoveredDate === dateKey;

      days.push(
        <Box
          key={day}
          minH="100px"
          p={0}
          border="1px solid"
          borderColor={borderColor}
          bg={isTodayDate ? todayBg : bgColor}
          _hover={{ bg: selectedBg }}
          position="relative"
          onMouseEnter={() => setHoveredDate(dateKey)}
          onMouseLeave={() => setHoveredDate(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuDate(date);
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            onContextMenuOpen();
          }}
        >
          {/* Date number and + button container */}
          <HStack justify="space-between" align="flex-start" p={2} pb={1}>
            <Text 
              fontSize="sm" 
              fontWeight={isTodayDate ? 'bold' : 'normal'}
              color={isTodayDate ? 'blue.500' : textColor}
            >
              {day}
            </Text>
            
            {/* Notion-style + button (only shows on hover) */}
            {isHovered && (
              <IconButton
                icon={<FiPlus />}
                aria-label="Add event"
                size="xs"
                variant="ghost"
                minW="20px"
                h="20px"
                borderRadius="md"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateClick(date);
                }}
                _hover={{ bg: 'gray.200' }}
                color={useSemanticToken('text.secondary')}
              />
            )}
          </HStack>
          
          {/* Events list */}
          <VStack spacing={1} align="stretch" px={2} pb={2}>
            {dayEvents.slice(0, 3).map(event => (
              <Box
                key={event.id}
                px={2}
                py={1}
                bg={eventBg}
                borderRadius="sm"
                fontSize="xs"
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event.id);
                }}
                _hover={{ opacity: 0.8 }}
              >
                <Text noOfLines={1} fontWeight="500">{event.title}</Text>
              </Box>
            ))}
            {dayEvents.length > 3 && (
              <Text fontSize="xs" color={mutedColor} px={2}>
                +{dayEvents.length - 3} more
              </Text>
            )}
          </VStack>

        </Box>
      );
    }

    return (
      <Box>
        {/* Week day headers */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0} mb={0}>
          {weekDays.map(day => (
            <Box 
              key={day} 
              p={2} 
              textAlign="center" 
              bg={headerBg}
              borderBottom="2px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="600"
              color={mutedColor}
            >
              {day}
            </Box>
          ))}
        </Grid>
        
        {/* Calendar grid */}
        <Grid templateColumns="repeat(7, 1fr)" gap={0}>
          {days}
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <VStack py={10} spacing={4}>
        <Spinner size="lg" />
        <Text color={mutedColor}>Loading calendar...</Text>
      </VStack>
    );
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <Box>
      {/* Calendar Header */}
      <HStack justify="space-between" mb={4} px={8}>
        <HStack spacing={4}>
          <Text fontSize="xl" fontWeight="bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <Button size="sm" variant="outline" onClick={handleToday}>
            Today
          </Button>
        </HStack>
        
        <HStack>
          <IconButton
            icon={<FiChevronLeft />}
            aria-label="Previous month"
            size="sm"
            variant="ghost"
            onClick={handlePreviousMonth}
          />
          <IconButton
            icon={<FiChevronRight />}
            aria-label="Next month"
            size="sm"
            variant="ghost"
            onClick={handleNextMonth}
          />
        </HStack>
      </HStack>

      {/* Calendar Grid */}
      <Box px={8}>
        {viewMode === 'month' && renderMonthView()}
      </Box>

      {/* Create Event Modal - Notion-style full page preview */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="2xl">
        <ModalOverlay />
        <ModalContent maxW="800px" minH="600px">
          {/* Header with Share and Actions */}
          <HStack 
            justify="flex-end" 
            p={4} 
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <Button size="sm" variant="ghost" leftIcon={<Icon as={FiExternalLink} />}>
              Share
            </Button>
            <IconButton
              icon={<Icon as={FiCopy} />}
              aria-label="Favorite"
              size="sm"
              variant="ghost"
            />
            <IconButton
              icon={<Icon as={FiTrash2} />}
              aria-label="More options"
              size="sm"
              variant="ghost"
            />
          </HStack>

          <ModalBody px={20} py={8}>
            <VStack align="stretch" spacing={6}>
              {/* Page Title */}
              <Input
                placeholder="New page"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleCreateEvent();
                }}
                fontSize="3xl"
                fontWeight="bold"
                border="none"
                px={0}
                _focus={{ boxShadow: 'none' }}
                _placeholder={{ color: 'gray.300' }}
                autoFocus
              />

              {/* Properties Section */}
              <VStack align="stretch" spacing={3}>
                {/* Date Property (Always visible) */}
                <HStack spacing={4}>
                  <HStack spacing={2} minW="120px" color={mutedColor}>
                    <Icon as={FiCalendar} boxSize={4} />
                    <Text fontSize="sm">Date</Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor}>
                    {selectedDate?.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </HStack>

                {/* Dynamic Properties */}
                {eventProperties.map((prop) => (
                  <PropertyField
                    key={prop.id}
                    propertyId={prop.id}
                    propertyName={prop.name}
                    propertyType={prop.type as PropertyType}
                    propertyIcon={prop.icon}
                    value={prop.value}
                    onChange={(value) => {
                      setEventProperties(
                        eventProperties.map((p) =>
                          p.id === prop.id ? { ...p, value } : p
                        )
                      );
                    }}
                    options={prop.options}
                    onRemove={() => {
                      setEventProperties(
                        eventProperties.filter((p) => p.id !== prop.id)
                      );
                    }}
                    labelWidth="120px"
                    size="sm"
                  />
                ))}

                {/* Add Property Button */}
                <Button
                  ref={addProperty.buttonRef}
                  onClick={addProperty.openMenu}
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon as={FiPlus} boxSize={4} />}
                  color={useSemanticToken('text.secondary')}
                  justifyContent="flex-start"
                  _hover={{ color: textColor }}
                >
                  Add a property
                </Button>
              </VStack>

              {/* Comments Section */}
              <Box>
                <Text fontSize="sm" color={mutedColor} mb={2}>Comments</Text>
                <HStack 
                  p={2} 
                  borderRadius="md"
                  _hover={{ bg: selectedBg }}
                  align="flex-start"
                >
                  <Box 
                    w="24px" 
                    h="24px" 
                    borderRadius="md" 
                    bg={useSemanticToken('surface.elevated')}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="bold"
                    color={useSemanticToken('text.secondary')}
                    flexShrink={0}
                  >
                    E
                  </Box>
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    variant="unstyled"
                    fontSize="sm"
                    _placeholder={{ color: 'gray.400' }}
                  />
                </HStack>
              </Box>

              {/* Footer Text */}
              <Text fontSize="sm" color={mutedColor} pt={4}>
                Press <Text as="span" fontWeight="600">Enter</Text> to continue with an empty page, or{' '}
                <Text 
                  as="span" 
                  textDecoration="underline" 
                  cursor="pointer"
                  _hover={{ color: textColor }}
                >
                  create a template
                </Text>
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Right-Click Context Menu */}
      {isContextMenuOpen && contextMenuPosition && contextMenuDate && (
        <>
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            onClick={onContextMenuClose}
            zIndex={1399}
          />
          <Box
            position="fixed"
            top={`${contextMenuPosition.y}px`}
            left={`${contextMenuPosition.x}px`}
            bg={bgColor}
            borderRadius="md"
            boxShadow="lg"
            border="1px solid"
            borderColor={borderColor}
            py={1}
            minW="200px"
            zIndex={1400}
          >
            <VStack align="stretch" spacing={0}>
              <HStack
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: selectedBg }}
                onClick={() => {
                  handleDateClick(contextMenuDate);
                  onContextMenuClose();
                }}
              >
                <Icon as={FiPlus} boxSize={4} />
                <Text fontSize="sm">Add new event</Text>
              </HStack>
              
              <HStack
                px={3}
                py={2}
                cursor="not-allowed"
                opacity={0.5}
              >
                <Icon as={FiEdit2} boxSize={4} />
                <Text fontSize="sm">Edit property</Text>
              </HStack>
              
              <Box h="1px" bg={borderColor} my={1} />
              
              <HStack
                px={3}
                py={2}
                cursor="not-allowed"
                opacity={0.5}
              >
                <Icon as={FiCopy} boxSize={4} />
                <Text fontSize="sm">Duplicate</Text>
              </HStack>
              
              <HStack
                px={3}
                py={2}
                cursor="not-allowed"
                opacity={0.5}
              >
                <Icon as={FiLink} boxSize={4} />
                <Text fontSize="sm">Copy link</Text>
              </HStack>
              
              <HStack
                px={3}
                py={2}
                cursor="not-allowed"
                opacity={0.5}
              >
                <Icon as={FiExternalLink} boxSize={4} />
                <Text fontSize="sm">Open in new tab</Text>
              </HStack>
              
              <Box h="1px" bg={borderColor} my={1} />
              
              <HStack
                px={3}
                py={2}
                cursor="not-allowed"
                opacity={0.5}
                color="red.500"
              >
                <Icon as={FiTrash2} boxSize={4} />
                <Text fontSize="sm">Delete</Text>
              </HStack>
            </VStack>
          </Box>
        </>
      )}
      
      {/* Property Command Menu */}
      <PropertyCommandMenu
        isOpen={addProperty.isOpen}
        position={addProperty.position}
        context={addProperty.context}
        onClose={addProperty.closeMenu}
        onSelect={addProperty.handleSelect}
      />
    </Box>
  );
}
