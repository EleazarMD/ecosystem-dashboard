/**
 * CalendarEventDetailsPanel - Shows event details in the right panel
 * With full edit/delete functionality
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Divider,
  Button,
  Avatar,
  Input,
  Textarea,
  Select,
  Switch,
  FormControl,
  FormLabel,
  useColorModeValue,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiMail,
  FiRepeat,
  FiAlertCircle,
  FiSave,
  FiX,
  FiVideo,
  FiPhone,
  FiLink,
} from 'react-icons/fi';
import { BsMicrosoft } from 'react-icons/bs';
import type { PanelProps } from './types';

interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name?: string;
  calendar_color?: string;
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
  recurrence_rule?: string;
}

// Parse Microsoft Teams meeting description into structured data
interface TeamsMeetingInfo {
  isTeamsMeeting: boolean;
  joinUrl?: string;
  meetingId?: string;
  passcode?: string;
  phoneNumbers?: Array<{ region: string; number: string }>;
  organizerEmail?: string;
  cleanDescription?: string;
}

function parseTeamsMeetingDescription(description: string): TeamsMeetingInfo {
  const result: TeamsMeetingInfo = { isTeamsMeeting: false };
  
  // Check if this is a Teams meeting
  if (!description.includes('teams.microsoft.com') && !description.includes('Microsoft Teams')) {
    return result;
  }
  
  result.isTeamsMeeting = true;
  
  // Extract Teams join URL
  const teamsUrlMatch = description.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/);
  if (teamsUrlMatch) {
    result.joinUrl = teamsUrlMatch[0];
  }
  
  // Extract Meeting ID
  const meetingIdMatch = description.match(/Meeting ID[:\s]+([0-9\s]+)/i);
  if (meetingIdMatch) {
    result.meetingId = meetingIdMatch[1].trim();
  }
  
  // Extract Passcode
  const passcodeMatch = description.match(/Passcode[:\s]+([A-Za-z0-9]+)/i);
  if (passcodeMatch) {
    result.passcode = passcodeMatch[1];
  }
  
  // Extract phone numbers (format: +1 XXX-XXX-XXXX or similar)
  const phoneMatches = description.matchAll(/\+\d[\d\s\-()]+(?:United States|US|Houston|[A-Z][a-z]+)?/g);
  const phones: Array<{ region: string; number: string }> = [];
  for (const match of phoneMatches) {
    const fullMatch = match[0];
    // Try to separate number from region
    const regionMatch = fullMatch.match(/(United States|US|Houston|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/);
    if (regionMatch) {
      phones.push({
        number: fullMatch.replace(regionMatch[0], '').trim(),
        region: regionMatch[1],
      });
    } else {
      phones.push({ number: fullMatch.trim(), region: '' });
    }
  }
  if (phones.length > 0) {
    result.phoneNumbers = phones.slice(0, 3); // Limit to 3 numbers
  }
  
  // Extract organizer email
  const organizerMatch = description.match(/organizer[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (organizerMatch) {
    result.organizerEmail = organizerMatch[1];
  }
  
  // Create clean description (remove Teams boilerplate)
  let clean = description
    .replace(/Microsoft Teams Need help\?.*$/s, '')
    .replace(/Join the meeting.*$/s, '')
    .replace(/________________+/g, '')
    .replace(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/g, '')
    .replace(/Meeting ID[:\s]+[0-9\s]+/gi, '')
    .replace(/Passcode[:\s]+[A-Za-z0-9]+/gi, '')
    .replace(/Dial in by phone.*$/s, '')
    .replace(/Find a local number.*$/s, '')
    .replace(/For organizers:.*$/s, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  if (clean && clean.length > 10) {
    result.cleanDescription = clean;
  }
  
  return result;
}

export function CalendarEventDetailsPanel(props: any) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // customData is passed directly from PanelRenderer
  const event = props.customData?.event as CalendarEvent | undefined;
  const onEventUpdated = props.customData?.onEventUpdated as ((event: CalendarEvent) => void) | undefined;
  const onEventDeleted = props.customData?.onEventDeleted as ((eventId: string) => void) | undefined;

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    all_day: false,
    status: 'confirmed' as 'tentative' | 'confirmed' | 'cancelled',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  });

  // Initialize edit form when entering edit mode
  const startEditing = useCallback(() => {
    if (event) {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      setEditForm({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start_time: startDate.toISOString().slice(0, 16),
        end_time: endDate.toISOString().slice(0, 16),
        all_day: event.all_day,
        status: event.status,
        priority: event.priority,
      });
      setIsEditing(true);
    }
  }, [event]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Save event changes
  const handleSave = useCallback(async () => {
    if (!event) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          start_time: new Date(editForm.start_time).toISOString(),
          end_time: new Date(editForm.end_time).toISOString(),
        }),
      });

      if (response.ok) {
        const updatedEvent = await response.json();
        toast({
          title: 'Event updated',
          status: 'success',
          duration: 3000,
        });
        setIsEditing(false);
        if (onEventUpdated) {
          onEventUpdated(updatedEvent.event || { ...event, ...editForm });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to update event',
          description: error.error || 'Please try again',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error updating event',
        description: 'Network error. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [event, editForm, toast, onEventUpdated]);

  // Delete event
  const handleDelete = useCallback(async () => {
    if (!event) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Event deleted',
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
        if (onEventDeleted) {
          onEventDeleted(event.id);
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to delete event',
          description: error.error || 'Please try again',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error deleting event',
        description: 'Network error. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [event, toast, onDeleteClose, onEventDeleted]);

  if (!event) {
    return (
      <Box p={4}>
        <VStack spacing={4} py={8} color="gray.500">
          <Icon as={FiCalendar} boxSize={12} />
          <Text textAlign="center">
            Select an event to view its details
          </Text>
        </VStack>
      </Box>
    );
  }

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'tentative': return 'yellow';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'normal': return 'blue';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Box p={4}>
      <VStack align="stretch" spacing={4}>
        {/* Event Title */}
        <Box>
          <HStack mb={2}>
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={event.calendar_color || 'blue.500'}
            />
            <Text fontSize="xs" color={mutedColor}>
              {event.calendar_name || 'Calendar'}
            </Text>
          </HStack>
          <Text fontSize="xl" fontWeight="bold">
            {event.title}
          </Text>
          <HStack mt={2} spacing={2}>
            <Badge colorScheme={getStatusColor(event.status)}>
              {event.status}
            </Badge>
            {event.priority !== 'normal' && (
              <Badge colorScheme={getPriorityColor(event.priority)}>
                {event.priority}
              </Badge>
            )}
            {event.ai_extracted && (
              <Badge colorScheme="purple">
                <HStack spacing={1}>
                  <Icon as={FiMail} boxSize={3} />
                  <Text>From Email</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
        </Box>

        <Divider />

        {/* Date & Time */}
        <VStack align="stretch" spacing={2}>
          <HStack color={mutedColor}>
            <Icon as={FiCalendar} />
            <Text fontWeight="medium">Date & Time</Text>
          </HStack>
          <Box pl={6}>
            <Text>{formatDate(startDate)}</Text>
            {event.all_day ? (
              <Text color={mutedColor}>All day</Text>
            ) : (
              <Text color={mutedColor}>
                {formatTime(startDate)} - {formatTime(endDate)}
              </Text>
            )}
            {event.recurrence_rule && (
              <HStack mt={1} color="blue.500" fontSize="sm">
                <Icon as={FiRepeat} />
                <Text>Recurring event</Text>
              </HStack>
            )}
          </Box>
        </VStack>

        {/* Location */}
        {event.location && (
          <VStack align="stretch" spacing={2}>
            <HStack color={mutedColor}>
              <Icon as={FiMapPin} />
              <Text fontWeight="medium">Location</Text>
            </HStack>
            <Box pl={6}>
              <Text>{event.location}</Text>
              <Button
                size="xs"
                variant="link"
                colorScheme="blue"
                leftIcon={<FiExternalLink />}
                onClick={() => {
                  window.open(
                    `https://maps.google.com/maps?q=${encodeURIComponent(event.location || '')}`,
                    '_blank'
                  );
                }}
              >
                Open in Maps
              </Button>
            </Box>
          </VStack>
        )}

        {/* Description - with Teams meeting parsing */}
        {event.description && (() => {
          const teamsInfo = parseTeamsMeetingDescription(event.description);
          
          if (teamsInfo.isTeamsMeeting) {
            return (
              <VStack align="stretch" spacing={3}>
                {/* Teams Meeting Card */}
                <Box
                  p={3}
                  bg="blue.50"
                  _dark={{ bg: 'blue.900' }}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="blue.200"
                  _darkBorderColor={{ borderColor: 'blue.700' }}
                >
                  <HStack mb={2}>
                    <Icon as={BsMicrosoft} color="blue.500" />
                    <Text fontWeight="medium" color="blue.700" _dark={{ color: 'blue.200' }}>
                      Microsoft Teams Meeting
                    </Text>
                  </HStack>
                  
                  {teamsInfo.joinUrl && (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<FiVideo />}
                      onClick={() => window.open(teamsInfo.joinUrl, '_blank')}
                      mb={2}
                      w="full"
                    >
                      Join Meeting
                    </Button>
                  )}
                  
                  {teamsInfo.meetingId && (
                    <HStack fontSize="xs" color={mutedColor} mb={1}>
                      <Text fontWeight="medium">Meeting ID:</Text>
                      <Text fontFamily="mono">{teamsInfo.meetingId}</Text>
                    </HStack>
                  )}
                  
                  {teamsInfo.passcode && (
                    <HStack fontSize="xs" color={mutedColor} mb={1}>
                      <Text fontWeight="medium">Passcode:</Text>
                      <Text fontFamily="mono">{teamsInfo.passcode}</Text>
                    </HStack>
                  )}
                  
                  {teamsInfo.phoneNumbers && teamsInfo.phoneNumbers.length > 0 && (
                    <Box mt={2}>
                      <HStack fontSize="xs" color={mutedColor} mb={1}>
                        <Icon as={FiPhone} />
                        <Text fontWeight="medium">Dial-in:</Text>
                      </HStack>
                      <VStack align="stretch" spacing={0} pl={4}>
                        {teamsInfo.phoneNumbers.map((phone, i) => (
                          <Text key={i} fontSize="xs" fontFamily="mono">
                            {phone.number} {phone.region && `(${phone.region})`}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </Box>
                
                {/* Clean description if any */}
                {teamsInfo.cleanDescription && (
                  <VStack align="stretch" spacing={2}>
                    <HStack color={mutedColor}>
                      <Icon as={FiAlertCircle} />
                      <Text fontWeight="medium">Description</Text>
                    </HStack>
                    <Box pl={6}>
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {teamsInfo.cleanDescription}
                      </Text>
                    </Box>
                  </VStack>
                )}
              </VStack>
            );
          }
          
          // Regular description (non-Teams)
          return (
            <VStack align="stretch" spacing={2}>
              <HStack color={mutedColor}>
                <Icon as={FiAlertCircle} />
                <Text fontWeight="medium">Description</Text>
              </HStack>
              <Box pl={6}>
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {event.description}
                </Text>
              </Box>
            </VStack>
          );
        })()}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <VStack align="stretch" spacing={2}>
            <HStack color={mutedColor}>
              <Icon as={FiUsers} />
              <Text fontWeight="medium">
                Attendees ({event.attendees.length})
              </Text>
            </HStack>
            <Box pl={6}>
              <VStack align="stretch" spacing={2}>
                {event.attendees.map((attendee, i) => (
                  <HStack key={i}>
                    <Avatar size="xs" name={attendee.name || attendee.email} />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm">
                        {attendee.name || attendee.email}
                      </Text>
                      {attendee.name && (
                        <Text fontSize="xs" color={mutedColor}>
                          {attendee.email}
                        </Text>
                      )}
                    </VStack>
                    <Badge
                      size="sm"
                      colorScheme={
                        attendee.status === 'accepted'
                          ? 'green'
                          : attendee.status === 'declined'
                          ? 'red'
                          : 'gray'
                      }
                    >
                      {attendee.status}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        )}

        <Divider />

        {/* Actions */}
        {isEditing ? (
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel fontSize="xs">Title</FormLabel>
              <Input
                size="sm"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
              />
            </FormControl>

            <HStack>
              <FormControl>
                <FormLabel fontSize="xs">Start</FormLabel>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">End</FormLabel>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </FormControl>
            </HStack>

            <FormControl display="flex" alignItems="center">
              <FormLabel fontSize="xs" mb={0}>All Day</FormLabel>
              <Switch
                size="sm"
                isChecked={editForm.all_day}
                onChange={(e) => setEditForm(prev => ({ ...prev, all_day: e.target.checked }))}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs">Location</FormLabel>
              <Input
                size="sm"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Add location"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="xs">Description</FormLabel>
              <Textarea
                size="sm"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add description"
                rows={3}
              />
            </FormControl>

            <HStack>
              <FormControl>
                <FormLabel fontSize="xs">Status</FormLabel>
                <Select
                  size="sm"
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="tentative">Tentative</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">Priority</FormLabel>
                <Select
                  size="sm"
                  value={editForm.priority}
                  onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as any }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </FormControl>
            </HStack>

            <HStack spacing={2} pt={2}>
              <Button
                size="sm"
                leftIcon={<FiSave />}
                colorScheme="green"
                flex={1}
                onClick={handleSave}
                isLoading={isSaving}
                loadingText="Saving..."
              >
                Save
              </Button>
              <Button
                size="sm"
                leftIcon={<FiX />}
                variant="ghost"
                onClick={cancelEditing}
                isDisabled={isSaving}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        ) : (
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FiEdit2 />}
              colorScheme="blue"
              variant="outline"
              flex={1}
              onClick={startEditing}
            >
              Edit
            </Button>
            <Button
              size="sm"
              leftIcon={<FiTrash2 />}
              colorScheme="red"
              variant="ghost"
              onClick={onDeleteOpen}
            >
              Delete
            </Button>
          </HStack>
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Event
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{event.title}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                ml={3}
                isLoading={isDeleting}
                loadingText="Deleting..."
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

export default CalendarEventDetailsPanel;
