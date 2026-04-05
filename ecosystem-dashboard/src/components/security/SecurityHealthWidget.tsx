'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, WarningTwoIcon } from '@chakra-ui/icons';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
}

interface SecurityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface SecurityHealthWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const statusColors: Record<string, string> = {
  healthy: 'green',
  degraded: 'yellow',
  unhealthy: 'red',
};

const statusIcons: Record<string, typeof CheckCircleIcon> = {
  healthy: CheckCircleIcon,
  degraded: WarningIcon,
  unhealthy: WarningTwoIcon,
};

export function SecurityHealthWidget({
  autoRefresh = true,
  refreshInterval = 30000,
}: SecurityHealthWidgetProps) {
  const [health, setHealth] = useState<SecurityHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch('/api/security/health');
        if (!response.ok && response.status !== 503) {
          throw new Error('Failed to fetch health status');
        }
        
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
        <CardBody>
          <Box textAlign="center" py={4}>
            <Spinner size="lg" />
            <Text mt={2} color="gray.500">Checking security health...</Text>
          </Box>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
        <CardBody>
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (!health) return null;

  const totalChecks = health.checks.length;
  const healthyPercent = (health.summary.healthy / totalChecks) * 100;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="sm">Security Health</Heading>
          <Badge colorScheme={statusColors[health.status]}>
            <HStack spacing={1}>
              <Icon as={statusIcons[health.status]} />
              <Text textTransform="capitalize">{health.status}</Text>
            </HStack>
          </Badge>
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          {/* Overall health bar */}
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium">System Health</Text>
              <Text fontSize="sm" color="gray.500">
                {health.summary.healthy}/{totalChecks} healthy
              </Text>
            </HStack>
            <Progress
              value={healthyPercent}
              colorScheme={health.status === 'healthy' ? 'green' : health.status === 'degraded' ? 'yellow' : 'red'}
              size="sm"
              borderRadius="full"
            />
          </Box>

          {/* Individual checks */}
          <VStack spacing={2} align="stretch">
            {health.checks.map((check) => (
              <Tooltip
                key={check.name}
                label={check.message}
                placement="top"
                hasArrow
              >
                <HStack
                  p={2}
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  borderRadius="md"
                  justify="space-between"
                >
                  <HStack spacing={2}>
                    <Icon
                      as={statusIcons[check.status]}
                      color={`${statusColors[check.status]}.500`}
                    />
                    <Text fontSize="sm" textTransform="capitalize">
                      {check.name.replace(/_/g, ' ')}
                    </Text>
                  </HStack>
                  <HStack spacing={2}>
                    {check.latencyMs !== undefined && (
                      <Text fontSize="xs" color="gray.500">
                        {check.latencyMs}ms
                      </Text>
                    )}
                    <Badge
                      colorScheme={statusColors[check.status]}
                      fontSize="xs"
                    >
                      {check.status}
                    </Badge>
                  </HStack>
                </HStack>
              </Tooltip>
            ))}
          </VStack>

          {/* Last updated */}
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
}
