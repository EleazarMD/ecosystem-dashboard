/**
 * Calendar Settings Page
 * 
 * User settings for managing connected calendar accounts
 * Multi-tenant compliant - each user manages their own accounts
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  Badge,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  Select,
  useToast,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  SimpleGrid,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiSettings,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiChevronRight,
  FiHome,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { SiGoogle, SiApple } from 'react-icons/si';
import { BsMicrosoft } from 'react-icons/bs';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CalendarOnboardingModal } from '@/components/calendar/CalendarOnboardingModal';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface SyncAccount {
  id: string;
  provider: 'google' | 'microsoft' | 'apple' | 'caldav';
  account_email: string;
  account_name?: string;
  sync_enabled: boolean;
  sync_interval_minutes?: number;
  last_sync_at?: string;
  last_sync_status?: string;
  calendars_count: number;
}

interface CalendarPreferences {
  defaultView: 'month' | 'week' | 'day' | 'agenda';
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  defaultCalendarId?: string;
  showDeclinedEvents: boolean;
  defaultReminder: number;
  timezone: string;
}

const PROVIDER_INFO = {
  google: { name: 'Google Calendar', icon: SiGoogle, color: '#4285F4' },
  microsoft: { name: 'Microsoft Outlook', icon: BsMicrosoft, color: '#00A4EF' },
  apple: { name: 'Apple iCloud', icon: SiApple, color: '#333333' },
  caldav: { name: 'CalDAV', icon: FiCalendar, color: '#666666' },
};

export default function CalendarSettingsPage() {
  const [accounts, setAccounts] = useState<SyncAccount[]>([]);
  const [preferences, setPreferences] = useState<CalendarPreferences>({
    defaultView: 'month',
    weekStartsOn: 0,
    showDeclinedEvents: false,
    defaultReminder: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/calendar/sync-accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('calendar_preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  // Save preferences
  const savePreferences = (newPrefs: CalendarPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('calendar_preferences', JSON.stringify(newPrefs));
    toast({
      title: 'Preferences saved',
      status: 'success',
      duration: 2000,
    });
  };

  // Toggle sync for account
  const toggleSync = async (accountId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/calendar/sync-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, sync_enabled: enabled }),
      });

      if (response.ok) {
        setAccounts(prev =>
          prev.map(a => (a.id === accountId ? { ...a, sync_enabled: enabled } : a))
        );
      }
    } catch (error) {
      toast({
        title: 'Failed to update',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Trigger manual sync
  const triggerSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const response = await fetch(`/api/calendar/sync-accounts/${accountId}/sync`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Sync started',
          description: 'Your calendars are being synced',
          status: 'info',
          duration: 3000,
        });
        // Refresh after a delay
        setTimeout(fetchAccounts, 3000);
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSyncing(null);
    }
  };

  // Disconnect account
  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar account?')) return;

    try {
      const response = await fetch(`/api/calendar/sync-accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Account disconnected',
          status: 'info',
          duration: 3000,
        });
        fetchAccounts();
      }
    } catch (error) {
      toast({
        title: 'Failed to disconnect',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <Container maxW="container.lg" py={6}>
        {/* Breadcrumb */}
        <Breadcrumb
          spacing="8px"
          separator={<Icon as={FiChevronRight} color="gray.500" />}
          mb={6}
        >
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <HStack spacing={1}>
                <Icon as={FiHome} />
                <Text>Home</Text>
              </HStack>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">
              <HStack spacing={1}>
                <Icon as={FiSettings} />
                <Text>Settings</Text>
              </HStack>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>
              <HStack spacing={1}>
                <Icon as={FiCalendar} />
                <Text>Calendar</Text>
              </HStack>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Header */}
        <HStack mb={6} justify="space-between">
          <Box>
            <Heading size="lg">Calendar Settings</Heading>
            <Text color="gray.500">
              Manage your connected calendar accounts and preferences
            </Text>
          </Box>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onOpen}>
            Add Account
          </Button>
        </HStack>

        <VStack spacing={6} align="stretch">
          {/* Connected Accounts */}
          <GlassPanel>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="md">Connected Accounts</Heading>
                <Badge colorScheme="blue">{accounts.length} connected</Badge>
              </HStack>

              {loading ? (
                <Box textAlign="center" py={8}>
                  <Spinner />
                </Box>
              ) : accounts.length === 0 ? (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="500">No calendar accounts connected</Text>
                    <Text fontSize="sm">
                      Connect your Google, Microsoft, or Apple calendar to sync events.
                    </Text>
                  </Box>
                </Alert>
              ) : (
                <VStack spacing={3} align="stretch">
                  {accounts.map((account) => {
                    const provider = PROVIDER_INFO[account.provider];
                    return (
                      <Box
                        key={account.id}
                        p={4}
                        bg="white"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <HStack justify="space-between">
                          <HStack spacing={4}>
                            <Icon
                              as={provider.icon}
                              boxSize={8}
                              color={provider.color}
                            />
                            <Box>
                              <HStack>
                                <Text fontWeight="600">
                                  {account.account_name || account.account_email}
                                </Text>
                                <Badge
                                  colorScheme={
                                    account.last_sync_status === 'success'
                                      ? 'green'
                                      : account.last_sync_status === 'error'
                                      ? 'red'
                                      : 'gray'
                                  }
                                  fontSize="xs"
                                >
                                  {account.last_sync_status || 'pending'}
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" color="gray.500">
                                {account.account_email}
                              </Text>
                              <HStack spacing={4} mt={1}>
                                <Text fontSize="xs" color="gray.400">
                                  {account.calendars_count} calendars
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                  Last sync: {formatLastSync(account.last_sync_at)}
                                </Text>
                              </HStack>
                            </Box>
                          </HStack>

                          <HStack spacing={2}>
                            <FormControl display="flex" alignItems="center" w="auto">
                              <FormLabel mb={0} mr={2} fontSize="sm">
                                Sync
                              </FormLabel>
                              <Switch
                                isChecked={account.sync_enabled}
                                onChange={(e) =>
                                  toggleSync(account.id, e.target.checked)
                                }
                                colorScheme="green"
                              />
                            </FormControl>
                            <IconButton
                              aria-label="Sync now"
                              icon={<FiRefreshCw />}
                              size="sm"
                              variant="ghost"
                              isLoading={syncing === account.id}
                              onClick={() => triggerSync(account.id)}
                            />
                            <IconButton
                              aria-label="Disconnect"
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => disconnectAccount(account.id)}
                            />
                          </HStack>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          </GlassPanel>

          {/* Preferences */}
          <GlassPanel>
            <VStack align="stretch" spacing={4}>
              <Heading size="md">Preferences</Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Default View</FormLabel>
                  <Select
                    value={preferences.defaultView}
                    onChange={(e) =>
                      savePreferences({
                        ...preferences,
                        defaultView: e.target.value as any,
                      })
                    }
                  >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                    <option value="agenda">Agenda</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Week Starts On</FormLabel>
                  <Select
                    value={preferences.weekStartsOn}
                    onChange={(e) =>
                      savePreferences({
                        ...preferences,
                        weekStartsOn: parseInt(e.target.value) as 0 | 1,
                      })
                    }
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Default Reminder</FormLabel>
                  <Select
                    value={preferences.defaultReminder}
                    onChange={(e) =>
                      savePreferences({
                        ...preferences,
                        defaultReminder: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={0}>None</option>
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    value={preferences.timezone}
                    onChange={(e) =>
                      savePreferences({
                        ...preferences,
                        timezone: e.target.value,
                      })
                    }
                  >
                    <option value="America/Chicago">Central Time (Chicago)</option>
                    <option value="America/New_York">Eastern Time (New York)</option>
                    <option value="America/Denver">Mountain Time (Denver)</option>
                    <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                    <option value="UTC">UTC</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <Divider />

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Show declined events</FormLabel>
                <Switch
                  isChecked={preferences.showDeclinedEvents}
                  onChange={(e) =>
                    savePreferences({
                      ...preferences,
                      showDeclinedEvents: e.target.checked,
                    })
                  }
                />
              </FormControl>
            </VStack>
          </GlassPanel>
        </VStack>

        {/* Onboarding Modal */}
        <CalendarOnboardingModal
          isOpen={isOpen}
          onClose={onClose}
          onComplete={fetchAccounts}
          showSkip={false}
          title="Connect Calendar Account"
        />
      </Container>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/settings/calendar',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
