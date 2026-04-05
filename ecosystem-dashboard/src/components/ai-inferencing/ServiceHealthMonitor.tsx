/**
 * Service Health Monitor Component
 * Displays health status of AI Inferencing Service and connected providers
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  
  Tooltip,
  Icon,
  Progress,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiClock,
  FiActivity,
  FiDatabase
} from 'react-icons/fi';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastCheck: string;
  responseTime?: number;
  details?: Record<string, any>;
}

interface ServiceHealthMonitorProps {
  inferencingUrl?: string;
  refreshInterval?: number;
}

export const ServiceHealthMonitor: React.FC<ServiceHealthMonitorProps> = ({
  inferencingUrl = 'http://localhost:9000',
  refreshInterval = 30000, // 30 seconds
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const cardBg = useSemanticToken('surface.elevated');
  const statBg = useSemanticToken('surface.base');

  const fetchHealth = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`${inferencingUrl}/health`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        setHealth({
          service: data.service || 'AI Inferencing Service',
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          uptime: 0, // Will be calculated from timestamp if available
          lastCheck: new Date().toISOString(),
          responseTime,
          details: data,
        });
      } else {
        setHealth({
          service: 'AI Inferencing Service',
          status: 'down',
          uptime: 0,
          lastCheck: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[Service Health] Failed to fetch health:', error);
      setHealth({
        service: 'AI Inferencing Service',
        status: 'down',
        uptime: 0,
        lastCheck: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [inferencingUrl, refreshInterval]);

  const successColor = useSemanticToken('status.success');
  const warningColor = useSemanticToken('status.warning');
  const errorColor = useSemanticToken('status.error');
  const neutralColor = useSemanticToken('text.secondary');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: FiCheckCircle, color: successColor };
      case 'degraded':
        return { icon: FiAlertCircle, color: warningColor };
      case 'down':
        return { icon: FiXCircle, color: errorColor };
      default:
        return { icon: FiAlertCircle, color: neutralColor };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge colorScheme="green">Healthy</Badge>;
      case 'degraded':
        return <Badge colorScheme="yellow">Degraded</Badge>;
      case 'down':
        return <Badge colorScheme="red">Down</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card bg={cardBg}>
        <CardBody>
          <Text>Loading health status...</Text>
          <Progress size="xs" isIndeterminate mt={2} />
        </CardBody>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  const statusConfig = getStatusIcon(health.status);

  return (
    <Card bg={cardBg}>
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">Service Health</Heading>
          {getStatusBadge(health.status)}
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Main Status */}
          <HStack spacing={3} p={3} bg={statBg} borderRadius="md">
            <Icon as={statusConfig.icon} color={statusConfig.color} boxSize={6} />
            <Box flex="1">
              <Text fontWeight="bold">{health.service}</Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                Last checked: {new Date(health.lastCheck).toLocaleTimeString()}
              </Text>
            </Box>
            {health.responseTime && (
              <Tooltip label="Response time">
                <HStack spacing={1} fontSize="sm">
                  <Icon as={FiClock} />
                  <Text>{health.responseTime}ms</Text>
                </HStack>
              </Tooltip>
            )}
          </HStack>

          {/* Details */}
          {health.details && (
            <VStack spacing={2} align="stretch">
              {health.details.database && (
                <HStack justify="space-between" p={2} fontSize="sm">
                  <HStack>
                    <Icon as={FiDatabase} />
                    <Text>Database</Text>
                  </HStack>
                  <Badge colorScheme={health.details.database === 'connected' ? 'green' : 'red'}>
                    {health.details.database}
                  </Badge>
                </HStack>
              )}

              {health.details.version && (
                <HStack justify="space-between" p={2} fontSize="sm">
                  <Text>Version</Text>
                  <Text fontWeight="medium">{health.details.version}</Text>
                </HStack>
              )}

              {health.details.timestamp && (
                <HStack justify="space-between" p={2} fontSize="sm">
                  <HStack>
                    <Icon as={FiActivity} />
                    <Text>Server Time</Text>
                  </HStack>
                  <Text fontWeight="medium">
                    {new Date(health.details.timestamp).toLocaleTimeString()}
                  </Text>
                </HStack>
              )}
            </VStack>
          )}

          {/* Status Message */}
          {health.status === 'down' && (
            <Box p={3} bg={useSemanticToken('status.errorSubtle')} borderRadius="md" borderLeft="4px solid" borderLeftColor={useSemanticToken('status.error')}>
              <Text fontSize="sm" color={useSemanticToken('status.error')}>
                Unable to connect to AI Inferencing Service at {inferencingUrl}
              </Text>
              <Text fontSize="xs" color={useSemanticToken('text.primary')} mt={1}>
                Please check that the service is running on port 9000
              </Text>
            </Box>
          )}

          {health.status === 'healthy' && health.details?.projects !== undefined && (
            <Box p={3} bg={useSemanticToken('status.successSubtle')} borderRadius="md" borderLeft="4px solid" borderLeftColor={useSemanticToken('status.success')}>
              <Text fontSize="sm" color={useSemanticToken('status.success')} fontWeight="medium">
                Service operational with {health.details.projects} projects, {health.details.services} services
              </Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default ServiceHealthMonitor;
