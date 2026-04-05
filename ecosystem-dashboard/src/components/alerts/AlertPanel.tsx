import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Badge,
  Button,
  VStack,
  HStack,
  Flex,
  Icon,
  Divider,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle,
  FiX,
} from 'react-icons/fi';

interface Alert {
  id: string;
  ruleName: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  currentValue: string | number;
  threshold: string | number;
  timestamp: string;
  status: 'active' | 'cleared';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface AlertPanelProps {
  maxHeight?: string;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ maxHeight = '400px' }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef(null);
  const toast = useToast();

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/ai-gateway/alerts?status=active');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch('/api/ai-gateway/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          acknowledgedBy: 'dashboard-user',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Alert acknowledged',
          status: 'success',
          duration: 3000,
        });
        loadAlerts();
      }
    } catch (error) {
      toast({
        title: 'Failed to acknowledge alert',
        status: 'error',
        duration: 3000,
      });
    }
    onClose();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return FiAlertCircle;
      case 'warning':
        return FiAlertTriangle;
      case 'info':
        return FiInfo;
      default:
        return FiInfo;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'orange';
      case 'info':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <Text color={useSemanticToken('text.secondary')}>Loading alerts...</Text>
        </CardBody>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardBody>
          <Flex align="center" justify="center" h="100px">
            <VStack spacing={2}>
              <Icon as={FiCheckCircle} boxSize={6} color="green.500" />
              <Text color={useSemanticToken('text.secondary')}>No active alerts</Text>
            </VStack>
          </Flex>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <Heading size="sm">Active Alerts</Heading>
            <Badge colorScheme="red" fontSize="sm">
              {alerts.length}
            </Badge>
          </Flex>
        </CardHeader>
        <Divider />
        <CardBody>
          <VStack
            spacing={3}
            align="stretch"
            maxH={maxHeight}
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}
          >
            {alerts.map((alert) => (
              <Box
                key={alert.id}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={`${getSeverityColor(alert.severity)}.200`}
                bg={`${getSeverityColor(alert.severity)}.50`}
                _hover={{ boxShadow: 'sm' }}
                transition="all 0.2s"
              >
                <Flex justify="space-between" align="start">
                  <HStack spacing={2} flex={1}>
                    <Icon
                      as={getSeverityIcon(alert.severity)}
                      boxSize={5}
                      color={`${getSeverityColor(alert.severity)}.500`}
                    />
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack spacing={2}>
                        <Text fontWeight="bold" fontSize="sm">
                          {alert.ruleName}
                        </Text>
                        <Badge
                          colorScheme={getSeverityColor(alert.severity)}
                          fontSize="xs"
                        >
                          {alert.severity}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {alert.description}
                      </Text>
                      <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
                        <Text>
                          <strong>Value:</strong> {alert.currentValue}
                        </Text>
                        <Text>
                          <strong>Threshold:</strong> {alert.threshold}
                        </Text>
                        <Text>{formatTimestamp(alert.timestamp)}</Text>
                      </HStack>
                    </VStack>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="gray"
                    variant="ghost"
                    onClick={() => {
                      setSelectedAlert(alert);
                      onOpen();
                    }}
                  >
                    Acknowledge
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>
        </CardBody>
      </Card>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Acknowledge Alert
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to acknowledge this alert?
              {selectedAlert && (
                <Box mt={4} p={3} bg={useSemanticToken('surface.base')} borderRadius="md">
                  <Text fontWeight="bold">{selectedAlert.ruleName}</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    {selectedAlert.description}
                  </Text>
                </Box>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => selectedAlert && handleAcknowledge(selectedAlert.id)}
                ml={3}
              >
                Acknowledge
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
