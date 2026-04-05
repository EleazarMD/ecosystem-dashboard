/**
 * CalendarSettingsPanel - Right panel for Calendar AI settings and workflows
 * Integrates with the dashboard's dynamic right panel system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Icon,
  Input,
  Textarea,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Badge,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  InputGroup,
  InputRightElement,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Collapse,
} from '@chakra-ui/react';
import {
  FiSettings,
  FiRefreshCw,
  FiPlus,
  FiPlay,
  FiPause,
  FiZap,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiCalendar,
  FiLink,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { SiApple, SiGoogle } from 'react-icons/si';
import { BsMicrosoft } from 'react-icons/bs';
import { FiEdit2 } from 'react-icons/fi';
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

interface CalendarAISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  autoSchedule: boolean;
  smartConflictResolution: boolean;
  emailEventExtraction: boolean;
  autoCreateThreshold: number;
}

interface SchedulingLink {
  id: string;
  name: string;
  slug: string;
  duration: number; // minutes
  availableHours: { start: string; end: string };
  availableDays: number[]; // 0-6 for Sun-Sat
  bufferTime: number; // minutes before/after
  enabled: boolean;
  bookingsCount: number;
}

interface CalendarWorkflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
  runCount: number;
}

interface SyncAccount {
  id: string;
  provider: 'apple' | 'google' | 'outlook' | 'mac_agent';
  email: string;
  status: 'connected' | 'syncing' | 'error';
  lastSync?: string;
  calendarsCount: number;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  calendar_type: string;
  sync_enabled: boolean;
}

interface CalendarSettingsPanelProps {
  customData?: {
    calendars?: Calendar[];
    selectedCalendars?: Set<string>;
    onCalendarToggle?: (calendarId: string, enabled: boolean) => void;
  };
}

export default function CalendarSettingsPanel({ customData }: CalendarSettingsPanelProps) {
  // Get calendars from customData or fetch them
  const [localCalendars, setLocalCalendars] = useState<Calendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  
  // Use calendars from customData if provided, otherwise fetch
  const calendars = customData?.calendars || localCalendars;
  const calendarSelection = customData?.selectedCalendars || selectedCalendars;
  const [settings, setSettings] = useState<CalendarAISettings>({
    model: 'gemini-2.0-flash-exp',
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: 'You are a helpful calendar assistant. Help users manage their schedule, find free time, and organize events efficiently.',
    autoSchedule: true,
    smartConflictResolution: true,
    emailEventExtraction: true,
    autoCreateThreshold: 0.85,
  });
  
  const [workflows, setWorkflows] = useState<CalendarWorkflow[]>([
    {
      id: '1',
      name: 'Morning Briefing',
      trigger: 'Daily at 8:00 AM',
      action: 'Send today\'s agenda summary',
      enabled: true,
      lastRun: new Date().toISOString(),
      runCount: 45,
    },
    {
      id: '2',
      name: 'Email Event Detection',
      trigger: 'New email received',
      action: 'Extract and suggest calendar events',
      enabled: true,
      lastRun: new Date().toISOString(),
      runCount: 128,
    },
    {
      id: '3',
      name: 'Conflict Alert',
      trigger: 'Event overlap detected',
      action: 'Notify and suggest resolution',
      enabled: true,
      runCount: 12,
    },
    {
      id: '4',
      name: 'Weekly Review',
      trigger: 'Sunday at 6:00 PM',
      action: 'Generate week summary and next week preview',
      enabled: false,
      runCount: 8,
    },
  ]);
  
  const [syncAccounts, setSyncAccounts] = useState<SyncAccount[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);
  const [isSyncingMac, setIsSyncingMac] = useState(false);
  
  // Apple Calendar connection form
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Calendar color picker and management
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editingCalendarName, setEditingCalendarName] = useState('');
  const [editingCalendarColor, setEditingCalendarColor] = useState('');
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState('blue.500');
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false);
  
  // Scheduling links
  const [schedulingLinks, setSchedulingLinks] = useState<SchedulingLink[]>([
    {
      id: '1',
      name: '30 Minute Meeting',
      slug: '30min',
      duration: 30,
      availableHours: { start: '09:00', end: '17:00' },
      availableDays: [1, 2, 3, 4, 5], // Mon-Fri
      bufferTime: 15,
      enabled: true,
      bookingsCount: 12,
    },
    {
      id: '2',
      name: '1 Hour Consultation',
      slug: '1hour',
      duration: 60,
      availableHours: { start: '10:00', end: '16:00' },
      availableDays: [1, 2, 3, 4, 5],
      bufferTime: 30,
      enabled: true,
      bookingsCount: 5,
    },
  ]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkDuration, setNewLinkDuration] = useState(30);
  
  const { isOpen: isAppleModalOpen, onOpen: onAppleModalOpen, onClose: onAppleModalClose } = useDisclosure();
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const mutedColor = useSemanticToken('text.secondary');

  const fetchSyncAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/sync/apple');
      if (response.ok) {
        const data = await response.json();
        setSyncAccounts(data.accounts?.map((acc: any) => ({
          id: acc.id,
          provider: 'apple',
          email: acc.account_email,
          status: acc.sync_enabled ? 'connected' : 'error',
          lastSync: acc.last_synced_at,
          calendarsCount: acc.discovered_calendars?.length || 0,
        })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch sync accounts:', error);
    }
  }, []);

  // Fetch calendars if not provided via customData
  const fetchCalendars = useCallback(async () => {
    if (customData?.calendars) return; // Skip if provided via props
    try {
      const response = await fetch('/api/calendar/calendars');
      if (response.ok) {
        const data = await response.json();
        setLocalCalendars(data.calendars || []);
        // Select all calendars by default
        setSelectedCalendars(new Set((data.calendars || []).map((c: Calendar) => c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    }
  }, [customData?.calendars]);

  useEffect(() => {
    fetchSyncAccounts();
    fetchCalendars();
  }, [fetchSyncAccounts, fetchCalendars]);

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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (syncAccounts.length > 0) {
        await fetch('/api/calendar/sync/apple', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: syncAccounts[0].id }),
        });
      }
      toast({
        title: 'Sync complete',
        status: 'success',
        duration: 3000,
      });
      fetchSyncAccounts();
    } catch (error) {
      toast({
        title: 'Sync failed',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const startEditingCalendar = (cal: Calendar) => {
    setEditingCalendarId(cal.id);
    setEditingCalendarName(cal.name);
    setEditingCalendarColor(cal.color);
  };

  const handleUpdateCalendar = async (calendarId: string) => {
    setIsUpdatingCalendar(true);
    try {
      const response = await fetch(`/api/calendar/calendars/${calendarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCalendarName,
          color: editingCalendarColor,
        }),
      });

      if (response.ok) {
        // Update local state
        setLocalCalendars(prev => prev.map(cal =>
          cal.id === calendarId
            ? { ...cal, name: editingCalendarName, color: editingCalendarColor }
            : cal
        ));
        toast({
          title: 'Calendar updated',
          status: 'success',
          duration: 3000,
        });
        setEditingCalendarId(null);
      } else {
        throw new Error('Failed to update calendar');
      }
    } catch (error) {
      toast({
        title: 'Failed to update calendar',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return;
    
    setIsUpdatingCalendar(true);
    try {
      const response = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCalendarName,
          color: newCalendarColor,
          calendar_type: 'local',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLocalCalendars(prev => [...prev, data.calendar]);
        toast({
          title: 'Calendar created',
          status: 'success',
          duration: 3000,
        });
        setIsCreatingCalendar(false);
        setNewCalendarName('');
        setNewCalendarColor('blue.500');
      } else {
        throw new Error('Failed to create calendar');
      }
    } catch (error) {
      toast({
        title: 'Failed to create calendar',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const toggleSchedulingLink = (id: string) => {
    setSchedulingLinks(prev => prev.map(link =>
      link.id === id ? { ...link, enabled: !link.enabled } : link
    ));
  };

  const handleCreateSchedulingLink = () => {
    if (!newLinkName.trim()) return;
    
    const slug = newLinkName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newLink: SchedulingLink = {
      id: Date.now().toString(),
      name: newLinkName,
      slug,
      duration: newLinkDuration,
      availableHours: { start: '09:00', end: '17:00' },
      availableDays: [1, 2, 3, 4, 5],
      bufferTime: 15,
      enabled: true,
      bookingsCount: 0,
    };
    
    setSchedulingLinks(prev => [...prev, newLink]);
    setIsCreatingLink(false);
    setNewLinkName('');
    setNewLinkDuration(30);
    
    toast({
      title: 'Scheduling link created',
      description: `Share your link: /book/${slug}`,
      status: 'success',
      duration: 5000,
    });
  };

  const copySchedulingLink = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied!',
      status: 'success',
      duration: 2000,
    });
  };

  const handleSyncFromMac = async () => {
    setIsSyncingMac(true);
    try {
      // First, trigger sync on Mac agent
      const macAgentUrl = process.env.NEXT_PUBLIC_MAC_AGENT_URL || 'http://mac-studio.local:8765';
      
      try {
        const macResponse = await fetch(`${macAgentUrl}/calendar/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            days_back: 7,
            days_forward: 60,
          }),
        });
        
        if (macResponse.ok) {
          const result = await macResponse.json();
          toast({
            title: 'Calendar sync complete',
            description: `Synced ${result.events_synced || 0} events from Mac Studio`,
            status: 'success',
            duration: 5000,
          });
          fetchSyncAccounts();
        } else {
          throw new Error('Mac agent sync failed');
        }
      } catch (macError) {
        // Fallback: Check if we have existing Mac-synced data
        toast({
          title: 'Mac Studio not reachable',
          description: 'Make sure the Mac agent is running on Mac Studio',
          status: 'warning',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Sync error',
        description: 'Failed to sync calendars from Mac Studio',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSyncingMac(false);
    }
  };

  const handleConnectOutlook = async () => {
    setIsConnectingOutlook(true);
    try {
      const response = await fetch('/api/calendar/sync/outlook', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Microsoft OAuth authorization page
        window.location.href = data.authorizationUrl;
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to connect Outlook',
          description: error.message || 'Please try again',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Connection error',
        description: 'Failed to initiate Outlook connection',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnectingOutlook(false);
    }
  };

  const handleConnectApple = async () => {
    if (!appleEmail.trim() || !applePassword.trim()) {
      toast({
        title: 'Please enter your Apple ID and app-specific password',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/calendar/sync/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: appleEmail,
          password: applePassword,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Apple Calendar connected!',
          description: 'Your calendars are now syncing.',
          status: 'success',
          duration: 5000,
        });
        onAppleModalClose();
        setAppleEmail('');
        setApplePassword('');
        fetchSyncAccounts();
      } else {
        const error = await response.json();
        toast({
          title: 'Connection failed',
          description: error.error || 'Please check your credentials and try again.',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Connection error',
        description: 'Unable to connect to Apple Calendar. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // State for collapsible calendar list
  const [showCalendarList, setShowCalendarList] = useState(false);

  return (
    <Box h="100%" overflowY="auto">
      {/* Tab Navigation */}
      <Tabs size="sm" variant="soft-rounded" colorScheme="blue" defaultIndex={0}>
        <TabList px={3} pt={3} pb={2} gap={1}>
          <Tab fontSize="xs" px={3} py={1}>
            <Icon as={FiSettings} mr={1} /> Settings
          </Tab>
          <Tab fontSize="xs" px={3} py={1}>
            <Icon as={FiCalendar} mr={1} /> Calendars
          </Tab>
          <Tab fontSize="xs" px={3} py={1}>
            <Icon as={FiLink} mr={1} /> Links
          </Tab>
          <Tab fontSize="xs" px={3} py={1}>
            <Icon as={FiZap} mr={1} /> AI
          </Tab>
        </TabList>

        <TabPanels>
          {/* ===== SETTINGS TAB (Default) ===== */}
          <TabPanel px={4} py={3}>
            <VStack align="stretch" spacing={4}>
              {/* Sync Status */}
              <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="bold" color={mutedColor}>CONNECTED ACCOUNTS</Text>
                <IconButton
                  aria-label="Sync now"
                  icon={<FiRefreshCw />}
                  size="xs"
                  variant="ghost"
                  isLoading={isSyncing}
                  onClick={handleSync}
                />
              </HStack>

              {syncAccounts.length === 0 ? (
                <VStack spacing={2}>
                  <Button
                    size="sm"
                    leftIcon={<Icon as={SiApple} />}
                    variant="outline"
                    w="full"
                    onClick={onAppleModalOpen}
                  >
                    Connect Apple Calendar
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Icon as={BsMicrosoft} />}
                    variant="outline"
                    w="full"
                    onClick={handleSyncFromMac}
                    isLoading={isSyncingMac}
                  >
                    Sync from Mac Studio (Work)
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Icon as={SiGoogle} />}
                    variant="outline"
                    w="full"
                    isDisabled
                  >
                    Connect Google Calendar
                  </Button>
                  <Text fontSize="2xs" color={mutedColor} textAlign="center">
                    Google Calendar coming soon
                  </Text>
                </VStack>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {syncAccounts.map((account) => (
                    <HStack
                      key={account.id}
                      p={2}
                      bg={bgColor}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="md"
                      justify="space-between"
                    >
                      <HStack>
                        <Icon 
                          as={account.provider === 'apple' ? SiApple : account.provider === 'outlook' ? BsMicrosoft : SiGoogle} 
                          color={account.status === 'connected' ? 'green.500' : 'red.500'}
                        />
                        <Box>
                          <Text fontSize="xs" fontWeight="medium">{account.email}</Text>
                          <Text fontSize="2xs" color={mutedColor}>
                            {account.calendarsCount} calendars
                          </Text>
                        </Box>
                      </HStack>
                      <Badge 
                        colorScheme={account.status === 'connected' ? 'green' : 'red'}
                        fontSize="2xs"
                      >
                        {account.status}
                      </Badge>
                    </HStack>
                  ))}
                  <HStack spacing={1}>
                    <Button
                      size="xs"
                      leftIcon={<Icon as={SiApple} />}
                      variant="ghost"
                      onClick={onAppleModalOpen}
                    >
                      Add Apple
                    </Button>
                    <Button
                      size="xs"
                      leftIcon={<Icon as={BsMicrosoft} />}
                      variant="ghost"
                      onClick={handleSyncFromMac}
                      isLoading={isSyncingMac}
                    >
                      Sync Work
                    </Button>
                  </HStack>
                </VStack>
              )}

              <Divider />

              {/* Workflows Section */}
              <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="bold" color={mutedColor}>WORKFLOWS</Text>
                <Button size="xs" leftIcon={<FiPlus />} variant="ghost">
                  Add
                </Button>
              </HStack>

              <VStack align="stretch" spacing={2}>
                {workflows.map((workflow) => (
                  <Box
                    key={workflow.id}
                    p={2}
                    bg={bgColor}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="md"
                  >
                    <HStack justify="space-between" mb={1}>
                      <HStack>
                        <Icon 
                          as={workflow.enabled ? FiPlay : FiPause} 
                          color={workflow.enabled ? 'green.500' : 'gray.400'}
                          boxSize={3}
                        />
                        <Text fontSize="xs" fontWeight="medium">{workflow.name}</Text>
                      </HStack>
                      <Switch
                        size="sm"
                        isChecked={workflow.enabled}
                        onChange={() => toggleWorkflow(workflow.id)}
                        colorScheme="green"
                      />
                    </HStack>
                    <Text fontSize="2xs" color={mutedColor}>
                      <Icon as={FiZap} mr={1} />
                      {workflow.trigger}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </VStack>
          </TabPanel>

          {/* ===== CALENDARS TAB ===== */}
          <TabPanel px={4} py={3}>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="bold" color={mutedColor}>
                  MY CALENDARS ({calendars.length})
                </Text>
                <Button
                  size="xs"
                  leftIcon={<FiPlus />}
                  variant="ghost"
                  onClick={() => setIsCreatingCalendar(true)}
                >
                  New
                </Button>
              </HStack>
              
              {calendars.length === 0 ? (
                <Text fontSize="xs" color={mutedColor} textAlign="center" py={4}>
                  No calendars found. Connect an account in Settings.
                </Text>
              ) : (
                <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                  {calendars.map((cal) => (
                    <HStack
                      key={cal.id}
                      p={2}
                      border="1px solid"
                      borderColor={borderColor}
                      borderRadius="md"
                      bg={bgColor}
                      justify="space-between"
                    >
                      <HStack flex={1}>
                        <Box
                          w={3}
                          h={3}
                          borderRadius="full"
                          bg={cal.color}
                        />
                        <Text fontSize="xs" flex={1} noOfLines={1}>{cal.name}</Text>
                        {cal.calendar_type?.includes('outlook') && (
                          <Icon as={BsMicrosoft} color={mutedColor} boxSize={3} />
                        )}
                        {cal.calendar_type?.includes('apple') && (
                          <Icon as={SiApple} color={mutedColor} boxSize={3} />
                        )}
                      </HStack>
                      <Switch
                        size="sm"
                        isChecked={calendarSelection.has(cal.id)}
                        onChange={(e) => handleCalendarToggle(cal.id, e.target.checked)}
                        colorScheme="blue"
                      />
                    </HStack>
                  ))}
                </VStack>
              )}

              {/* Create Calendar Form */}
              {isCreatingCalendar && (
                <Box p={3} border="1px solid" borderColor="blue.500" borderRadius="md" bg={bgColor}>
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" fontWeight="medium">New Calendar</Text>
                    <Input
                      size="xs"
                      value={newCalendarName}
                      onChange={(e) => setNewCalendarName(e.target.value)}
                      placeholder="Calendar name"
                    />
                    <HStack spacing={1} flexWrap="wrap">
                      {CALENDAR_COLORS.map((color) => (
                        <Box
                          key={color}
                          w={5}
                          h={5}
                          borderRadius="full"
                          bg={color}
                          cursor="pointer"
                          border={newCalendarColor === color ? '2px solid white' : 'none'}
                          boxShadow={newCalendarColor === color ? `0 0 0 2px ${color}` : 'none'}
                          onClick={() => setNewCalendarColor(color)}
                        />
                      ))}
                    </HStack>
                    <HStack justify="flex-end" spacing={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingCalendar(false);
                          setNewCalendarName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        onClick={handleCreateCalendar}
                        isLoading={isUpdatingCalendar}
                        isDisabled={!newCalendarName.trim()}
                      >
                        Create
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* ===== SCHEDULING LINKS TAB ===== */}
          <TabPanel px={4} py={3}>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="bold" color={mutedColor}>SCHEDULING LINKS</Text>
                <Button
                  size="xs"
                  leftIcon={<FiPlus />}
                  variant="ghost"
                  onClick={() => setIsCreatingLink(true)}
                >
                  New
                </Button>
              </HStack>

              <VStack align="stretch" spacing={2}>
                {schedulingLinks.map((link) => (
                  <Box
                    key={link.id}
                    p={2}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="md"
                    bg={bgColor}
                  >
                    <HStack justify="space-between" mb={1}>
                      <HStack>
                        <Text fontSize="xs" fontWeight="medium">{link.name}</Text>
                        <Badge colorScheme="blue" fontSize="2xs">{link.duration}min</Badge>
                      </HStack>
                      <Switch
                        size="sm"
                        isChecked={link.enabled}
                        onChange={() => toggleSchedulingLink(link.id)}
                        colorScheme="green"
                      />
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="2xs" color={mutedColor}>
                        /book/{link.slug} • {link.bookingsCount} bookings
                      </Text>
                      <IconButton
                        aria-label="Copy link"
                        icon={<FiExternalLink />}
                        size="xs"
                        variant="ghost"
                        onClick={() => copySchedulingLink(link.slug)}
                      />
                    </HStack>
                  </Box>
                ))}
              </VStack>

              {/* Create Scheduling Link Form */}
              {isCreatingLink && (
                <Box p={3} border="1px solid" borderColor="blue.500" borderRadius="md" bg={bgColor}>
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="xs" fontWeight="medium">New Scheduling Link</Text>
                    <Input
                      size="xs"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                      placeholder="e.g., Quick Chat, Strategy Call"
                    />
                    <FormControl>
                      <FormLabel fontSize="2xs">Duration</FormLabel>
                      <Select
                        size="xs"
                        value={newLinkDuration}
                        onChange={(e) => setNewLinkDuration(parseInt(e.target.value))}
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </Select>
                    </FormControl>
                    <HStack justify="flex-end" spacing={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setIsCreatingLink(false);
                          setNewLinkName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        onClick={handleCreateSchedulingLink}
                        isDisabled={!newLinkName.trim()}
                      >
                        Create
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* ===== AI SETTINGS TAB ===== */}
          <TabPanel px={4} py={3}>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="xs" fontWeight="bold" color={mutedColor}>AI MODEL</Text>

              {/* Model Selection */}
              <FormControl>
                <FormLabel fontSize="xs" fontWeight="medium">Model</FormLabel>
                <Select
                  size="sm"
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                >
                  <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
                </Select>
              </FormControl>

              {/* Temperature */}
              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" fontWeight="medium" mb={0}>Temperature</FormLabel>
                  <Text fontSize="xs" color="blue.500">{settings.temperature.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={settings.temperature}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setSettings(prev => ({ ...prev, temperature: v }))}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <Divider />

              <Text fontSize="xs" fontWeight="bold" color={mutedColor}>AI FEATURES</Text>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <FormLabel fontSize="xs" mb={0}>Auto Schedule</FormLabel>
                  <FormHelperText fontSize="2xs" mt={0}>
                    AI suggests optimal times
                  </FormHelperText>
                </Box>
                <Switch
                  size="sm"
                  isChecked={settings.autoSchedule}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoSchedule: e.target.checked }))}
                  colorScheme="green"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <FormLabel fontSize="xs" mb={0}>Smart Conflict Resolution</FormLabel>
                  <FormHelperText fontSize="2xs" mt={0}>
                    Auto-suggest fixes for overlaps
                  </FormHelperText>
                </Box>
                <Switch
                  size="sm"
                  isChecked={settings.smartConflictResolution}
                  onChange={(e) => setSettings(prev => ({ ...prev, smartConflictResolution: e.target.checked }))}
                  colorScheme="green"
                />
              </FormControl>

              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <FormLabel fontSize="xs" mb={0}>Email Event Extraction</FormLabel>
                  <FormHelperText fontSize="2xs" mt={0}>
                    Auto-detect events in emails
                  </FormHelperText>
                </Box>
                <Switch
                  size="sm"
                  isChecked={settings.emailEventExtraction}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailEventExtraction: e.target.checked }))}
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Apple Calendar Connection Modal */}
      <Modal isOpen={isAppleModalOpen} onClose={onAppleModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={SiApple} />
              <Text>Connect Apple Calendar</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md" fontSize="sm">
                <AlertIcon />
                <Box>
                  <Text fontWeight="medium">App-Specific Password Required</Text>
                  <Text fontSize="xs">
                    For security, Apple requires an app-specific password for third-party apps.
                  </Text>
                </Box>
              </Alert>

              <FormControl isRequired>
                <FormLabel fontSize="sm">Apple ID (Email)</FormLabel>
                <Input
                  type="email"
                  value={appleEmail}
                  onChange={(e) => setAppleEmail(e.target.value)}
                  placeholder="your@icloud.com"
                  size="sm"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm">App-Specific Password</FormLabel>
                <InputGroup size="sm">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={applePassword}
                    onChange={(e) => setApplePassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormHelperText fontSize="xs">
                  <Link
                    href="https://appleid.apple.com/account/manage"
                    isExternal
                    color="blue.500"
                  >
                    Generate at appleid.apple.com <Icon as={FiExternalLink} mx={1} />
                  </Link>
                </FormHelperText>
              </FormControl>

              <Box p={3} bg={bgColor} borderRadius="md" fontSize="xs">
                <Text fontWeight="medium" mb={2}>How to create an app-specific password:</Text>
                <VStack align="stretch" spacing={1} pl={2}>
                  <Text>1. Go to appleid.apple.com and sign in</Text>
                  <Text>2. Click "App-Specific Passwords"</Text>
                  <Text>3. Click "+" to generate a new password</Text>
                  <Text>4. Name it "AI Homelab Calendar"</Text>
                  <Text>5. Copy the generated password here</Text>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAppleModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={SiApple} />}
              onClick={handleConnectApple}
              isLoading={isConnecting}
              loadingText="Connecting..."
            >
              Connect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
