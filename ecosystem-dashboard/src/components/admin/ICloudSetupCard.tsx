/**
 * ICloud Setup Card
 * Parent-facing UI for provisioning a child's iCloud email + calendar.
 *
 * Uses /api/admin/children/[id]/icloud to:
 * - GET current connection status
 * - POST to provision email (IMAP via CIG) + calendar (CalDAV)
 * - DELETE to disconnect
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Switch,
  FormControl,
  FormLabel,
  Collapse,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiMail,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiTrash2,
  FiRefreshCw,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface ICloudSetupCardProps {
  childId: string;
  childName: string;
}

interface ICloudStatus {
  email: {
    connected: boolean;
    error?: string;
    provider: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
  calendar: {
    connected: boolean;
    accountId?: string;
    accountEmail?: string;
    lastSyncAt?: string;
    lastSyncStatus?: string;
    calendars: Array<{ id: string; name: string; color?: string; selected: boolean }>;
  };
}

export function ICloudSetupCard({ childId, childName }: ICloudSetupCardProps) {
  const toast = useToast();
  const { isOpen: showPassword, onToggle: togglePassword } = useDisclosure();
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<ICloudStatus | null>(null);

  // Form state
  const [icloudEmail, setIcloudEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableCalendar, setEnableCalendar] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/icloud`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.calendar?.accountEmail) {
          setIcloudEmail(data.calendar.accountEmail);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleProvision = async () => {
    if (!icloudEmail || !appPassword) {
      toast({
        title: 'Missing information',
        description: 'iCloud email and app-specific password are required.',
        status: 'warning',
        duration: 4000,
      });
      return;
    }

    if (!enableEmail && !enableCalendar) {
      toast({
        title: 'Nothing to provision',
        description: 'Enable at least email or calendar.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setProvisioning(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/icloud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icloudEmail,
          appSpecificPassword: appPassword,
          enableEmail,
          enableCalendar,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'iCloud connected!',
          description: `${childName}'s iCloud email and calendar are now connected.`,
          status: 'success',
          duration: 5000,
        });
        setAppPassword('');
      } else {
        toast({
          title: 'Setup completed with errors',
          description: data.results?.errors?.join('; ') || 'Some services failed to connect.',
          status: 'warning',
          duration: 6000,
        });
      }

      await fetchStatus();
    } catch (error) {
      toast({
        title: 'Provisioning failed',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProvisioning(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/admin/children/${childId}/icloud`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disconnectEmail: true, disconnectCalendar: true }),
      });

      if (res.ok) {
        toast({
          title: 'iCloud disconnected',
          description: `${childName}'s iCloud accounts have been removed.`,
          status: 'info',
          duration: 3000,
        });
        await fetchStatus();
      }
    } catch (error) {
      toast({
        title: 'Disconnect failed',
        description: (error as Error).message,
        status: 'error',
        duration: 4000,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const emailConnected = status?.email?.connected ?? false;
  const calendarConnected = status?.calendar?.connected ?? false;
  const anyConnected = emailConnected || calendarConnected;

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={3}>
          <Spinner size="lg" />
          <Text color="gray.500">Checking iCloud status for {childName}...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Status Cards */}
      <SimpleGridStatus
        emailConnected={emailConnected}
        calendarConnected={calendarConnected}
        status={status}
      />

      {/* Provisioning Form (shown when not fully connected) */}
      {!anyConnected && (
        <GlassPanel variant="light" p={5}>
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Text fontSize="lg" fontWeight="semibold">Connect {childName}'s iCloud</Text>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Set up iCloud Mail and Calendar for your child. You'll need an
              app-specific password from Apple ID settings.
            </Text>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1} fontSize="sm">
                <Text fontWeight="medium">How to get an app-specific password:</Text>
                <Text>1. Go to{' '}
                  <Text as="span" color="blue.500" textDecoration="underline">
                    <a href="https://appleid.apple.com/account/manage" target="_blank" rel="noopener noreferrer">
                      appleid.apple.com <FiExternalLink style={{ display: 'inline' }} />
                    </a>
                  </Text>
                </Text>
                <Text>2. Sign in with the child's Apple ID</Text>
                <Text>3. Under "App-Specific Passwords", generate a new password</Text>
                <Text>4. Use that password here (not the regular Apple ID password)</Text>
              </VStack>
            </Alert>

            <FormControl>
              <FormLabel fontSize="sm">iCloud Email Address</FormLabel>
              <Input
                placeholder="child@icloud.com"
                value={icloudEmail}
                onChange={(e) => setIcloudEmail(e.target.value)}
                size="md"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">App-Specific Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="App-specific password from Apple ID"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  size="md"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <FiEyeOff /> : <FiEye />}
                    onClick={togglePassword}
                    size="sm"
                    variant="ghost"
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <HStack spacing={6}>
              <HStack>
                <Switch
                  isChecked={enableEmail}
                  onChange={(e) => setEnableEmail(e.target.checked)}
                  colorScheme="blue"
                />
                <HStack spacing={1}>
                  <FiMail />
                  <Text fontSize="sm">Email (IMAP)</Text>
                </HStack>
              </HStack>
              <HStack>
                <Switch
                  isChecked={enableCalendar}
                  onChange={(e) => setEnableCalendar(e.target.checked)}
                  colorScheme="blue"
                />
                <HStack spacing={1}>
                  <FiCalendar />
                  <Text fontSize="sm">Calendar (CalDAV)</Text>
                </HStack>
              </HStack>
            </HStack>

            <Button
              colorScheme="blue"
              onClick={handleProvision}
              isLoading={provisioning}
              loadingText="Connecting..."
              size="md"
            >
              Connect iCloud
            </Button>
          </VStack>
        </GlassPanel>
      )}

      {/* Management Panel (shown when connected) */}
      {anyConnected && (
        <GlassPanel variant="light" p={5}>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="semibold">iCloud Management</Text>
              <HStack>
                <Button
                  leftIcon={<FiRefreshCw />}
                  size="sm"
                  variant="outline"
                  onClick={fetchStatus}
                  isLoading={loading}
                >
                  Refresh
                </Button>
                <Button
                  leftIcon={<FiTrash2 />}
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={handleDisconnect}
                  isLoading={disconnecting}
                  loadingText="Disconnecting..."
                >
                  Disconnect
                </Button>
              </HStack>
            </HStack>

            <Divider />

            {/* Calendar Details */}
            {calendarConnected && status?.calendar && (
              <VStack align="start" spacing={2}>
                <HStack>
                  <FiCalendar />
                  <Text fontWeight="medium" fontSize="sm">Calendar</Text>
                  <Badge colorScheme="green" size="sm">Connected</Badge>
                </HStack>
                {status.calendar.accountEmail && (
                  <Text fontSize="sm" color="gray.500">
                    Account: {status.calendar.accountEmail}
                  </Text>
                )}
                {status.calendar.lastSyncAt && (
                  <Text fontSize="sm" color="gray.500">
                    Last sync: {new Date(status.calendar.lastSyncAt).toLocaleString()}
                    {status.calendar.lastSyncStatus && ` (${status.calendar.lastSyncStatus})`}
                  </Text>
                )}
                {status.calendar.calendars.length > 0 && (
                  <VStack align="start" spacing={1} mt={1}>
                    <Text fontSize="xs" color="gray.400">Synced Calendars:</Text>
                    {status.calendar.calendars.map((cal) => (
                      <HStack key={cal.id} spacing={2}>
                        <Box
                          w={3}
                          h={3}
                          borderRadius="full"
                          bg={cal.color || '#3B82F6'}
                        />
                        <Text fontSize="sm">{cal.name}</Text>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            )}

            {/* Email Details */}
            {emailConnected && status?.email && (
              <VStack align="start" spacing={2}>
                <HStack>
                  <FiMail />
                  <Text fontWeight="medium" fontSize="sm">Email</Text>
                  <Badge colorScheme="green" size="sm">Connected</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  IMAP: {status.email.imapHost}:{status.email.imapPort}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  SMTP: {status.email.smtpHost}:{status.email.smtpPort}
                </Text>
              </VStack>
            )}

            {/* Re-provision option */}
            <Collapse in={true}>
              <Divider />
              <VStack align="stretch" spacing={3} pt={2}>
                <Text fontSize="sm" color="gray.500">
                  Need to update credentials? Enter new app-specific password and reconnect:
                </Text>
                <FormControl>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New app-specific password"
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                      size="sm"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password visibility"
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        onClick={togglePassword}
                        size="xs"
                        variant="ghost"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleProvision}
                  isLoading={provisioning}
                  isDisabled={!appPassword}
                  loadingText="Updating..."
                >
                  Update Connection
                </Button>
              </VStack>
            </Collapse>
          </VStack>
        </GlassPanel>
      )}
    </VStack>
  );
}

// ─── Status Grid Component ─────────────────────────────────────────────────

function SimpleGridStatus({
  emailConnected,
  calendarConnected,
  status,
}: {
  emailConnected: boolean;
  calendarConnected: boolean;
  status: ICloudStatus | null;
}) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
      gap={4}
    >
      {/* Email Status */}
      <GlassPanel variant="light" p={4}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FiMail />
            <Text fontWeight="medium" fontSize="sm">iCloud Email</Text>
          </HStack>
          {emailConnected ? (
            <HStack spacing={1}>
              <FiCheckCircle color="green" />
              <Badge colorScheme="green" size="sm">Connected</Badge>
            </HStack>
          ) : (
            <HStack spacing={1}>
              <FiXCircle color="gray" />
              <Badge colorScheme="gray" size="sm">Not Connected</Badge>
            </HStack>
          )}
        </HStack>
        {status?.email?.error && (
          <Text fontSize="xs" color="red.500" mt={2}>
            {status.email.error}
          </Text>
        )}
      </GlassPanel>

      {/* Calendar Status */}
      <GlassPanel variant="light" p={4}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FiCalendar />
            <Text fontWeight="medium" fontSize="sm">iCloud Calendar</Text>
          </HStack>
          {calendarConnected ? (
            <HStack spacing={1}>
              <FiCheckCircle color="green" />
              <Badge colorScheme="green" size="sm">Connected</Badge>
            </HStack>
          ) : (
            <HStack spacing={1}>
              <FiXCircle color="gray" />
              <Badge colorScheme="gray" size="sm">Not Connected</Badge>
            </HStack>
          )}
        </HStack>
        {status?.calendar?.lastSyncStatus === 'failed' && (
          <Text fontSize="xs" color="red.500" mt={2}>
            Last sync failed
          </Text>
        )}
      </GlassPanel>
    </Box>
  );
}

export default ICloudSetupCard;
