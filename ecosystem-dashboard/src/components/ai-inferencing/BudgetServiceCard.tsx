import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Progress,
  Badge,
  Button,
  IconButton,
  
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Switch,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
} from '@chakra-ui/react';
import { FiEdit, FiPause, FiPlay, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BudgetStatus {
  serviceId: string;
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    alertThresholds: {
      50: boolean;
      80: boolean;
      100: boolean;
    };
    autoSuspend: boolean;
    notificationWebhook?: string;
  };
  usage: {
    dailyCost: number;
    monthlyCost: number;
  };
  dailyPercent: string;
  monthlyPercent: string;
  suspended: boolean;
}

interface BudgetServiceCardProps {
  status: BudgetStatus;
  onUpdate: () => void;
}

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = 'ai-inferencing-admin-key-2024';

export function BudgetServiceCard({ status, onUpdate }: BudgetServiceCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(status.budget);
  
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const dangerColor = useSemanticToken('status.errorSubtle');
  const warningColor = useSemanticToken('status.warningSubtle');
  
  const dailyPercent = parseFloat(status.dailyPercent);
  const monthlyPercent = parseFloat(status.monthlyPercent);

  const getDailyStatus = () => {
    if (dailyPercent >= 100) return { color: 'red', label: 'EXCEEDED', icon: FiAlertTriangle };
    if (dailyPercent >= 80) return { color: 'orange', label: 'CRITICAL', icon: FiAlertTriangle };
    if (dailyPercent >= 50) return { color: 'yellow', label: 'WARNING', icon: FiAlertTriangle };
    return { color: 'green', label: 'HEALTHY', icon: FiCheckCircle };
  };

  const getMonthlyStatus = () => {
    if (monthlyPercent >= 100) return { color: 'red', label: 'EXCEEDED', icon: FiAlertTriangle };
    if (monthlyPercent >= 80) return { color: 'orange', label: 'CRITICAL', icon: FiAlertTriangle };
    if (monthlyPercent >= 50) return { color: 'yellow', label: 'WARNING', icon: FiAlertTriangle };
    return { color: 'green', label: 'HEALTHY', icon: FiCheckCircle };
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/budgets/${status.serviceId}`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Failed to update budget');

      toast({
        title: 'Budget Updated',
        description: `Budget for ${status.serviceId} has been updated`,
        status: 'success',
        duration: 3000,
      });

      setIsEditOpen(false);
      onUpdate();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/budgets/${status.serviceId}/resume`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_KEY,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to resume service');

      toast({
        title: 'Service Resumed',
        description: `${status.serviceId} has been resumed`,
        status: 'success',
        duration: 3000,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Resume Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dailyStatus = getDailyStatus();
  const monthlyStatus = getMonthlyStatus();

  return (
    <>
      <Card
        bg={status.suspended ? dangerColor : cardBg}
        borderColor={status.suspended ? 'red.500' : borderColor}
        borderWidth="2px"
      >
        <CardHeader>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <Heading size="md">{status.serviceId}</Heading>
              {status.suspended && (
                <Badge colorScheme="red" fontSize="xs">
                  ⛔ SUSPENDED
                </Badge>
              )}
            </VStack>
            <HStack>
              {status.suspended ? (
                <Tooltip label="Resume service">
                  <IconButton
                    aria-label="Resume"
                    icon={<FiPlay />}
                    size="sm"
                    colorScheme="green"
                    onClick={handleResume}
                    isLoading={isLoading}
                  />
                </Tooltip>
              ) : (
                <Tooltip label="Edit budget">
                  <IconButton
                    aria-label="Edit"
                    icon={<FiEdit />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditOpen(true)}
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>
        </CardHeader>

        <CardBody>
          <VStack spacing={4} align="stretch">
            {/* Daily Budget */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    Daily Budget
                  </Text>
                  <Badge colorScheme={dailyStatus.color} variant="subtle">
                    {dailyStatus.label}
                  </Badge>
                </HStack>
                <Text fontSize="sm" fontWeight="bold">
                  ${status.usage.dailyCost.toFixed(4)} / ${status.budget.dailyLimit.toFixed(2)}
                </Text>
              </HStack>
              <Progress
                value={Math.min(dailyPercent, 100)}
                colorScheme={dailyStatus.color}
                size="sm"
                borderRadius="md"
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                {dailyPercent.toFixed(1)}% used
              </Text>
            </Box>

            {/* Monthly Budget */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    Monthly Budget
                  </Text>
                  <Badge colorScheme={monthlyStatus.color} variant="subtle">
                    {monthlyStatus.label}
                  </Badge>
                </HStack>
                <Text fontSize="sm" fontWeight="bold">
                  ${status.usage.monthlyCost.toFixed(4)} / ${status.budget.monthlyLimit.toFixed(2)}
                </Text>
              </HStack>
              <Progress
                value={Math.min(monthlyPercent, 100)}
                colorScheme={monthlyStatus.color}
                size="sm"
                borderRadius="md"
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                {monthlyPercent.toFixed(1)}% used
              </Text>
            </Box>

            {/* Budget Details */}
            <HStack spacing={4} pt={2} borderTopWidth="1px">
              <Stat size="sm">
                <StatLabel fontSize="xs">Auto-Suspend</StatLabel>
                <StatNumber fontSize="sm">
                  {status.budget.autoSuspend ? '✓ Enabled' : '✗ Disabled'}
                </StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Alerts</StatLabel>
                <StatNumber fontSize="sm">
                  {Object.values(status.budget.alertThresholds).filter(Boolean).length}/3
                </StatNumber>
              </Stat>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Configure Budget: {status.serviceId}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Daily Limit (USD)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.dailyLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyLimit: parseFloat(e.target.value) })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Monthly Limit (USD)</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthlyLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyLimit: parseFloat(e.target.value) })
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Alert Thresholds</FormLabel>
                <VStack align="start" pl={4}>
                  <Switch
                    isChecked={formData.alertThresholds[50]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        alertThresholds: {
                          ...formData.alertThresholds,
                          50: e.target.checked,
                        },
                      })
                    }
                  >
                    50% Warning
                  </Switch>
                  <Switch
                    isChecked={formData.alertThresholds[80]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        alertThresholds: {
                          ...formData.alertThresholds,
                          80: e.target.checked,
                        },
                      })
                    }
                  >
                    80% Critical
                  </Switch>
                  <Switch
                    isChecked={formData.alertThresholds[100]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        alertThresholds: {
                          ...formData.alertThresholds,
                          100: e.target.checked,
                        },
                      })
                    }
                  >
                    100% Exceeded
                  </Switch>
                </VStack>
              </FormControl>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel mb={0}>Auto-Suspend at 100%</FormLabel>
                  <Switch
                    isChecked={formData.autoSuspend}
                    onChange={(e) =>
                      setFormData({ ...formData, autoSuspend: e.target.checked })
                    }
                  />
                </HStack>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                  Automatically suspend service when budget limit is exceeded
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Notification Webhook (Optional)</FormLabel>
                <Input
                  type="url"
                  placeholder="https://your-webhook.com/alerts"
                  value={formData.notificationWebhook || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationWebhook: e.target.value })
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={isLoading}>
              Save Budget
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
