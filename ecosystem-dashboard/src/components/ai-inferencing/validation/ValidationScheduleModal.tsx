/**
 * Validation Schedule Configuration Modal
 * Allows users to set up automatic validation schedules
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
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Select,
  Switch,
  Text,
  Divider,
  Box,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { FiCalendar, FiClock, FiBell } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ValidationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyId: string;
  keyName?: string;
}

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

export function ValidationScheduleModal({
  isOpen,
  onClose,
  keyId,
  keyName,
}: ValidationScheduleModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState('hourly');
  const [validationType, setValidationType] = useState('quick');
  const [skipIfRecentlyUsed, setSkipIfRecentlyUsed] = useState(true);
  const [alertOnFailure, setAlertOnFailure] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(3);
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const toast = useToast();
  const cardBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  // Load existing schedule
  useEffect(() => {
    if (isOpen) {
      loadSchedule();
    }
  }, [isOpen, keyId]);

  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/schedule`,
        {
          headers: { 'X-Admin-Key': ADMIN_KEY },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.schedule) {
          setEnabled(data.schedule.enabled);
          setFrequency(data.schedule.frequency);
          setValidationType(data.schedule.validation_type);
          setSkipIfRecentlyUsed(data.schedule.skip_if_recently_used);
          setAlertOnFailure(data.schedule.alert_on_failure);
          setAlertThreshold(data.schedule.alert_threshold);
        }
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/schedule`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled,
            frequency,
            validationType,
            skipIfRecentlyUsed,
            alertOnFailure,
            alertThreshold,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Schedule Updated',
          description: `Automatic validation ${enabled ? 'enabled' : 'disabled'} for this key`,
          status: 'success',
          duration: 3000,
        });
        onClose();
      } else {
        throw new Error('Failed to update schedule');
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Update Schedule',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/schedule`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_KEY },
        }
      );

      if (response.ok) {
        toast({
          title: 'Schedule Removed',
          description: 'Automatic validation disabled',
          status: 'success',
          duration: 3000,
        });
        onClose();
      } else {
        throw new Error('Failed to delete schedule');
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Remove Schedule',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'hourly':
        return 'Every hour';
      case 'every_6h':
        return 'Every 6 hours';
      case 'daily':
        return 'Once per day';
      case 'weekly':
        return 'Once per week';
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <FiCalendar />
            <Text>Validation Schedule</Text>
          </HStack>
          {keyName && (
            <Text fontSize="sm" fontWeight="normal" color={useSemanticToken('text.secondary')} mt={1}>
              {keyName}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {loadingSchedule ? (
            <Box py={8} textAlign="center">
              <Text color={useSemanticToken('text.secondary')}>Loading schedule...</Text>
            </Box>
          ) : (
            <VStack spacing={5} align="stretch">
              {/* Enable/Disable */}
              <HStack justify="space-between" p={4} bg={cardBg} borderRadius="md">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">Automatic Validation</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    Periodically test this API key
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  colorScheme="blue"
                  isChecked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              </HStack>

              {enabled && (
                <>
                  <Divider />

                  {/* Frequency */}
                  <FormControl>
                    <FormLabel>
                      <HStack>
                        <FiClock />
                        <Text>Frequency</Text>
                      </HStack>
                    </FormLabel>
                    <Select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="every_6h">Every 6 Hours</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </Select>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                      {getFrequencyDescription(frequency)}
                    </Text>
                  </FormControl>

                  {/* Validation Type */}
                  <FormControl>
                    <FormLabel>Validation Type</FormLabel>
                    <Select
                      value={validationType}
                      onChange={(e) => setValidationType(e.target.value)}
                    >
                      <option value="quick">Quick (Free)</option>
                      <option value="standard">Standard (~$0.001)</option>
                      <option value="full">Full (~$0.01)</option>
                    </Select>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                      Quick validation uses minimal API calls
                    </Text>
                  </FormControl>

                  <Divider />

                  {/* Smart Options */}
                  <Box>
                    <Text fontWeight="bold" mb={3}>
                      Smart Options
                    </Text>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm">Skip if Recently Used</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            Don't validate if key was used in last 30 minutes
                          </Text>
                        </VStack>
                        <Switch
                          isChecked={skipIfRecentlyUsed}
                          onChange={(e) => setSkipIfRecentlyUsed(e.target.checked)}
                        />
                      </HStack>
                    </VStack>
                  </Box>

                  <Divider />

                  {/* Alerts */}
                  <Box>
                    <FormLabel>
                      <HStack>
                        <FiBell />
                        <Text>Failure Alerts</Text>
                      </HStack>
                    </FormLabel>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm">Alert on Failure</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            Notify when validation fails
                          </Text>
                        </VStack>
                        <Switch
                          isChecked={alertOnFailure}
                          onChange={(e) => setAlertOnFailure(e.target.checked)}
                        />
                      </HStack>

                      {alertOnFailure && (
                        <FormControl>
                          <FormLabel fontSize="sm">Alert After</FormLabel>
                          <Select
                            size="sm"
                            value={alertThreshold}
                            onChange={(e) => setAlertThreshold(Number(e.target.value))}
                          >
                            <option value={1}>1 consecutive failure</option>
                            <option value={2}>2 consecutive failures</option>
                            <option value={3}>3 consecutive failures</option>
                            <option value={5}>5 consecutive failures</option>
                          </Select>
                        </FormControl>
                      )}
                    </VStack>
                  </Box>

                  {/* Summary */}
                  <Box p={4} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Summary
                    </Text>
                    <VStack align="start" spacing={1} fontSize="xs" color={useSemanticToken('text.secondary')}>
                      <Text>
                        ✓ Validate {getFrequencyDescription(frequency).toLowerCase()}
                      </Text>
                      <Text>
                        ✓ Using {validationType} validation
                      </Text>
                      {skipIfRecentlyUsed && (
                        <Text>✓ Skip if recently used</Text>
                      )}
                      {alertOnFailure && (
                        <Text>
                          ✓ Alert after {alertThreshold} consecutive failure{alertThreshold > 1 ? 's' : ''}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </>
              )}
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2} width="full" justify="space-between">
            <Button
              variant="ghost"
              colorScheme="red"
              onClick={handleDelete}
              isLoading={loading}
            >
              Remove Schedule
            </Button>
            <HStack>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={loading}
              >
                Save Schedule
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ValidationScheduleModal;
