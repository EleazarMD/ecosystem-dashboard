/**
 * Calendar Onboarding Modal
 * 
 * Multi-tenant calendar account connection modal
 * Supports Google, Microsoft/Outlook, and Apple/iCloud calendars
 * Can be summoned from user settings or during onboarding
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Box,
  Badge,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  Collapse,
  Icon,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { SiGoogle, SiApple } from 'react-icons/si';
import { BsMicrosoft } from 'react-icons/bs';

interface SyncAccount {
  id: string;
  provider: 'google' | 'microsoft' | 'apple' | 'caldav';
  account_email: string;
  account_name?: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  calendars_count: number;
}

interface CalendarOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  showSkip?: boolean;
  title?: string;
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: SiGoogle,
    color: '#4285F4',
    description: 'Connect your Google Calendar account',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Outlook',
    icon: BsMicrosoft,
    color: '#00A4EF',
    description: 'Connect your Outlook or Microsoft 365 calendar',
  },
  {
    id: 'apple',
    name: 'Apple iCloud',
    icon: SiApple,
    color: '#333333',
    description: 'Connect your iCloud calendar (requires app-specific password)',
  },
];

export function CalendarOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  showSkip = true,
  title = 'Connect Your Calendars',
}: CalendarOnboardingModalProps) {
  const [accounts, setAccounts] = useState<SyncAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showAppleForm, setShowAppleForm] = useState(false);
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const toast = useToast();

  // Fetch connected accounts
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
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  // Check URL for success/error params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success) {
      toast({
        title: 'Calendar Connected',
        description: `Successfully connected your ${success.replace('_connected', '').replace('_', ' ')} calendar`,
        status: 'success',
        duration: 5000,
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchAccounts();
    }

    if (error) {
      toast({
        title: 'Connection Failed',
        description: error.replace(/_/g, ' '),
        status: 'error',
        duration: 5000,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  // Connect OAuth provider
  const connectProvider = async (provider: string) => {
    setConnecting(provider);

    try {
      const response = await fetch(`/api/calendar/oauth/${provider}?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to OAuth URL
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        toast({
          title: 'Connection Failed',
          description: error.message || error.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to initiate calendar connection',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setConnecting(null);
    }
  };

  // Connect Apple/iCloud via CalDAV
  const connectApple = async () => {
    if (!appleEmail || !applePassword) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your Apple ID email and app-specific password',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setConnecting('apple');

    try {
      const response = await fetch('/api/calendar/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'apple',
          account_email: appleEmail,
          account_name: appleEmail,
          caldav_url: 'https://caldav.icloud.com',
          caldav_username: appleEmail,
          caldav_password: applePassword,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Apple Calendar Connected',
          status: 'success',
          duration: 3000,
        });
        setAppleEmail('');
        setApplePassword('');
        setShowAppleForm(false);
        fetchAccounts();
      } else {
        const error = await response.json();
        toast({
          title: 'Connection Failed',
          description: error.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setConnecting(null);
    }
  };

  // Disconnect account
  const disconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/calendar/sync-accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Account Disconnected',
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

  // Get provider info
  const getProviderInfo = (providerId: string) => {
    return PROVIDERS.find(p => p.id === providerId) || PROVIDERS[0];
  };

  // Check if provider is connected
  const isProviderConnected = (providerId: string) => {
    return accounts.some(a => a.provider === providerId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Icon as={FiCalendar} color="blue.500" />
            <Text>{title}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Info text */}
            <Text fontSize="sm" color="gray.600">
              Connect your calendar accounts to sync events across all your devices and see everything in one place.
            </Text>

            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
              </Box>
            ) : (
              <>
                {/* Connected accounts */}
                {accounts.length > 0 && (
                  <Box>
                    <Text fontWeight="600" mb={2} fontSize="sm" color="gray.500">
                      CONNECTED ACCOUNTS
                    </Text>
                    <VStack spacing={2} align="stretch">
                      {accounts.map((account) => {
                        const provider = getProviderInfo(account.provider);
                        return (
                          <HStack
                            key={account.id}
                            p={3}
                            bg="gray.50"
                            borderRadius="md"
                            justify="space-between"
                          >
                            <HStack spacing={3}>
                              <Icon as={provider.icon} color={provider.color} boxSize={5} />
                              <Box>
                                <Text fontWeight="500" fontSize="sm">
                                  {account.account_name || account.account_email}
                                </Text>
                                <HStack spacing={2}>
                                  <Text fontSize="xs" color="gray.500">
                                    {account.account_email}
                                  </Text>
                                  {account.calendars_count > 0 && (
                                    <Badge colorScheme="blue" fontSize="xs">
                                      {account.calendars_count} calendars
                                    </Badge>
                                  )}
                                </HStack>
                              </Box>
                            </HStack>
                            <HStack>
                              <Badge colorScheme={account.sync_enabled ? 'green' : 'gray'}>
                                {account.sync_enabled ? 'Syncing' : 'Paused'}
                              </Badge>
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
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                <Divider />

                {/* Add new account */}
                <Box>
                  <Text fontWeight="600" mb={3} fontSize="sm" color="gray.500">
                    ADD CALENDAR ACCOUNT
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {PROVIDERS.map((provider) => {
                      const isConnected = isProviderConnected(provider.id);
                      const isApple = provider.id === 'apple';

                      return (
                        <Box key={provider.id}>
                          <Button
                            w="100%"
                            variant="outline"
                            justifyContent="flex-start"
                            leftIcon={<Icon as={provider.icon} color={provider.color} />}
                            rightIcon={
                              isConnected ? (
                                <Badge colorScheme="green" ml="auto">Connected</Badge>
                              ) : isApple ? (
                                <Icon as={showAppleForm ? FiChevronUp : FiChevronDown} />
                              ) : (
                                <Icon as={FiExternalLink} />
                              )
                            }
                            isLoading={connecting === provider.id}
                            onClick={() => {
                              if (isApple) {
                                setShowAppleForm(!showAppleForm);
                              } else {
                                connectProvider(provider.id);
                              }
                            }}
                            _hover={{ bg: 'gray.50' }}
                          >
                            <Box textAlign="left" flex={1}>
                              <Text fontWeight="500">{provider.name}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {provider.description}
                              </Text>
                            </Box>
                          </Button>

                          {/* Apple iCloud form */}
                          {isApple && (
                            <Collapse in={showAppleForm}>
                              <Box p={4} bg="gray.50" borderRadius="md" mt={2}>
                                <VStack spacing={3}>
                                  <Alert status="info" size="sm" borderRadius="md">
                                    <AlertIcon />
                                    <Text fontSize="xs">
                                      You need an app-specific password for iCloud.{' '}
                                      <a
                                        href="https://support.apple.com/en-us/HT204397"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'underline' }}
                                      >
                                        Learn how to create one
                                      </a>
                                    </Text>
                                  </Alert>
                                  <FormControl>
                                    <FormLabel fontSize="sm">Apple ID Email</FormLabel>
                                    <Input
                                      size="sm"
                                      type="email"
                                      value={appleEmail}
                                      onChange={(e) => setAppleEmail(e.target.value)}
                                      placeholder="your@icloud.com"
                                    />
                                  </FormControl>
                                  <FormControl>
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
                                          aria-label="Toggle password"
                                          icon={showPassword ? <FiEyeOff /> : <FiEye />}
                                          size="xs"
                                          variant="ghost"
                                          onClick={() => setShowPassword(!showPassword)}
                                        />
                                      </InputRightElement>
                                    </InputGroup>
                                  </FormControl>
                                  <Button
                                    size="sm"
                                    colorScheme="blue"
                                    w="100%"
                                    onClick={connectApple}
                                    isLoading={connecting === 'apple'}
                                  >
                                    Connect iCloud Calendar
                                  </Button>
                                </VStack>
                              </Box>
                            </Collapse>
                          )}
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            {showSkip && (
              <Button variant="ghost" onClick={onClose}>
                Skip for now
              </Button>
            )}
            <Button
              colorScheme="blue"
              onClick={() => {
                onComplete?.();
                onClose();
              }}
              isDisabled={accounts.length === 0}
            >
              {accounts.length > 0 ? 'Done' : 'Connect a Calendar'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default CalendarOnboardingModal;
