/**
 * Calendar Settings Modal
 * Manage external calendar connections and sync settings
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Button,
  Switch,
  Badge,
  Icon,
  useToast,
  Divider,
  Box,
} from '@chakra-ui/react';
import { FiCalendar, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CalendarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  databaseId: string;
}

export function CalendarSettings({ isOpen, onClose, databaseId }: CalendarSettingsProps) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [icloudConnected, setIcloudConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const infoBg = useSemanticToken('surface.base');
  const infoText = useSemanticToken('text.primary');

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    // TODO: Check if calendars are connected
    // For now, check cookies
    const cookies = document.cookie;
    setGoogleConnected(cookies.includes('google_calendar_token'));
  };

  const handleConnectGoogle = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/calendar/google-auth';
  };

  const handleDisconnectGoogle = () => {
    // Clear cookies
    document.cookie = 'google_calendar_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'google_calendar_refresh=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setGoogleConnected(false);
    
    toast({
      title: 'Google Calendar disconnected',
      status: 'info',
      duration: 2000,
    });
  };

  const handleSyncNow = async () => {
    if (!googleConnected) {
      toast({
        title: 'No calendar connected',
        description: 'Please connect a calendar first',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`/api/calendar/sync?databaseId=${databaseId}`);
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Calendar synced',
          description: `Synced ${data.events?.length || 0} events`,
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Could not sync calendar events',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Calendar Settings</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Google Calendar */}
            <Box>
              <Text fontWeight="600" mb={3}>
                External Calendars
              </Text>
              
              <VStack spacing={3} align="stretch">
                <HStack 
                  justify="space-between" 
                  p={3} 
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                >
                  <HStack>
                    <Icon as={FiCalendar} boxSize={5} color="blue.500" />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="500">Google Calendar</Text>
                      <HStack spacing={1}>
                        {googleConnected ? (
                          <>
                            <Icon as={FiCheck} boxSize={3} color="green.500" />
                            <Text fontSize="xs" color="green.500">Connected</Text>
                          </>
                        ) : (
                          <>
                            <Icon as={FiX} boxSize={3} color={useSemanticToken('text.secondary')} />
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Not connected</Text>
                          </>
                        )}
                      </HStack>
                    </VStack>
                  </HStack>
                  
                  {googleConnected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      onClick={handleDisconnectGoogle}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={handleConnectGoogle}
                    >
                      Connect
                    </Button>
                  )}
                </HStack>

                <HStack 
                  justify="space-between" 
                  p={3} 
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  opacity={0.6}
                >
                  <HStack>
                    <Icon as={FiCalendar} boxSize={5} color={useSemanticToken('text.secondary')} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="500">Apple iCloud</Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Coming soon</Text>
                    </VStack>
                  </HStack>
                  
                  <Button size="sm" isDisabled>
                    Connect
                  </Button>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Sync Settings */}
            <Box>
              <Text fontWeight="600" mb={3}>
                Sync Settings
              </Text>
              
              <VStack spacing={3} align="stretch">
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="500">Auto-sync</Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Automatically sync changes
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    colorScheme="blue"
                  />
                </HStack>

                <Button
                  leftIcon={<Icon as={FiRefreshCw} />}
                  onClick={handleSyncNow}
                  isLoading={syncing}
                  loadingText="Syncing..."
                  variant="outline"
                  width="full"
                  isDisabled={!googleConnected}
                >
                  Sync Now
                </Button>
              </VStack>
            </Box>

            {/* Info */}
            <Box 
              p={3} 
              bg={infoBg} 
              borderRadius="md"
            >
              <Text fontSize="xs" color={infoText}>
                <strong>Note:</strong> Two-way sync keeps your Notion database and external calendars in sync. 
                Events created in either location will appear in both.
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
