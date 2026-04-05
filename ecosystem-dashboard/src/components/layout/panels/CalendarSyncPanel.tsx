/**
 * CalendarSyncPanel - Connected accounts and automation workflows
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
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Link,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiPlus,
  FiPlay,
  FiPause,
  FiZap,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import { SiApple } from 'react-icons/si';
import { BsMicrosoft } from 'react-icons/bs';
import { useSemanticToken } from '@/hooks/useSemanticToken';

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

export default function CalendarSyncPanel() {
  const [syncAccounts, setSyncAccounts] = useState<SyncAccount[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingMac, setIsSyncingMac] = useState(false);
  
  // Apple Calendar connection form
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { isOpen: isAppleModalOpen, onOpen: onAppleModalOpen, onClose: onAppleModalClose } = useDisclosure();
  
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

  useEffect(() => {
    fetchSyncAccounts();
  }, [fetchSyncAccounts]);

  const handleConnectApple = async () => {
    if (!appleEmail || !applePassword) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both email and app-specific password',
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
          action: 'connect',
          email: appleEmail,
          password: applePassword,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Connected!',
          description: 'Apple Calendar connected successfully',
          status: 'success',
          duration: 3000,
        });
        onAppleModalClose();
        setAppleEmail('');
        setApplePassword('');
        fetchSyncAccounts();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Connection failed');
      }
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncFromMac = async () => {
    setIsSyncingMac(true);
    try {
      const response = await fetch('http://100.108.41.22:8780/calendar/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast({
          title: 'Sync triggered',
          description: 'Calendar sync from Mac Studio started',
          status: 'success',
          duration: 3000,
        });
        // Refresh accounts after a delay
        setTimeout(fetchSyncAccounts, 3000);
      } else {
        throw new Error('Failed to trigger sync');
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not reach Mac Studio. Is the agent running?',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSyncingMac(false);
    }
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflowId ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'apple':
        return SiApple;
      case 'outlook':
        return BsMicrosoft;
      default:
        return FiRefreshCw;
    }
  };

  return (
    <Box h="full" overflowY="auto" p={4}>
      <VStack align="stretch" spacing={4}>
        {/* Connected Accounts */}
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
            Connected Accounts
          </Text>
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="xs"
            variant="ghost"
            onClick={fetchSyncAccounts}
            isLoading={isSyncing}
          />
        </HStack>

        {syncAccounts.length > 0 ? (
          <VStack align="stretch" spacing={2}>
            {syncAccounts.map((account) => (
              <Box
                key={account.id}
                p={3}
                bg={bgColor}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
              >
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={getProviderIcon(account.provider)} />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">{account.email}</Text>
                      <Text fontSize="xs" color={mutedColor}>
                        {account.calendarsCount} calendars
                      </Text>
                    </VStack>
                  </HStack>
                  <Badge
                    colorScheme={account.status === 'connected' ? 'green' : 'red'}
                    fontSize="2xs"
                  >
                    {account.status === 'connected' ? 'CONNECTED' : account.status.toUpperCase()}
                  </Badge>
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color={mutedColor} textAlign="center" py={2}>
            No accounts connected
          </Text>
        )}

        {/* Add Account Buttons */}
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size="sm"
            leftIcon={<Icon as={SiApple} />}
            variant="outline"
            onClick={onAppleModalOpen}
          >
            Add Apple
          </Button>
          <Button
            size="sm"
            leftIcon={<Icon as={BsMicrosoft} />}
            variant="outline"
            onClick={handleSyncFromMac}
            isLoading={isSyncingMac}
            loadingText="Syncing..."
          >
            Sync Work
          </Button>
        </HStack>

        <Divider />

        {/* Workflows */}
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="bold" color={mutedColor} textTransform="uppercase">
            Workflows
          </Text>
          <Button size="xs" leftIcon={<FiPlus />} variant="ghost">
            Add
          </Button>
        </HStack>

        <VStack align="stretch" spacing={2}>
          {workflows.map((workflow) => (
            <Box
              key={workflow.id}
              p={3}
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
                  <Text fontSize="sm" fontWeight="medium">{workflow.name}</Text>
                </HStack>
                <Switch
                  size="sm"
                  isChecked={workflow.enabled}
                  onChange={() => toggleWorkflow(workflow.id)}
                  colorScheme="green"
                />
              </HStack>
              <Text fontSize="xs" color={mutedColor}>
                <Icon as={FiZap} mr={1} />
                {workflow.trigger}
              </Text>
              <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                → {workflow.action}
              </Text>
              {workflow.runCount > 0 && (
                <Text fontSize="2xs" color={mutedColor} mt={1}>
                  Ran {workflow.runCount} times
                </Text>
              )}
            </Box>
          ))}
        </VStack>
      </VStack>

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
