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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { WarningIcon, CheckCircleIcon, InfoIcon } from '@chakra-ui/icons';
import { formatDistanceToNow } from 'date-fns';

interface AnomalyEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
}

interface AnomalyStats {
  total: number;
  bySeverity: Record<string, number>;
  recentAnomalies: AnomalyEvent[];
}

interface AnomalyWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const severityColors: Record<string, string> = {
  low: 'blue',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

const severityIcons: Record<string, typeof InfoIcon> = {
  low: InfoIcon,
  medium: WarningIcon,
  high: WarningIcon,
  critical: WarningIcon,
};

export function AnomalyWidget({
  autoRefresh = true,
  refreshInterval = 30000,
}: AnomalyWidgetProps) {
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        const response = await fetch('/api/security/metrics?period=day');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        
        const data = await response.json();
        
        // Also fetch recent anomaly events
        const auditResponse = await fetch('/api/security/audit-log?eventType=anomaly_detected&limit=5');
        let recentAnomalies: AnomalyEvent[] = [];
        
        if (auditResponse.ok) {
          const auditData = await auditResponse.json();
          recentAnomalies = auditData.events.map((e: any) => ({
            id: e.id,
            type: e.action.replace('anomaly:', ''),
            severity: e.severity,
            description: e.reason,
            detectedAt: e.timestamp,
          }));
        }

        setStats({
          total: data.metrics.anomalies.total,
          bySeverity: data.metrics.anomalies.bySeverity,
          recentAnomalies,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnomalies();

    if (autoRefresh) {
      const interval = setInterval(fetchAnomalies, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
        <CardBody>
          <Box textAlign="center" py={4}>
            <Spinner size="lg" />
            <Text mt={2} color="gray.500">Loading anomaly data...</Text>
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

  const hasAnomalies = stats && stats.total > 0;
  const criticalCount = stats?.bySeverity?.critical || 0;
  const highCount = stats?.bySeverity?.high || 0;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="sm">Anomaly Detection</Heading>
          {hasAnomalies ? (
            <Badge colorScheme={criticalCount > 0 ? 'red' : highCount > 0 ? 'orange' : 'yellow'}>
              {stats?.total} detected
            </Badge>
          ) : (
            <Badge colorScheme="green">
              <HStack spacing={1}>
                <CheckCircleIcon />
                <Text>All Clear</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          {/* Severity breakdown */}
          <HStack spacing={4} justify="space-around">
            {['critical', 'high', 'medium', 'low'].map((severity) => (
              <Stat key={severity} size="sm" textAlign="center">
                <StatLabel textTransform="capitalize">{severity}</StatLabel>
                <StatNumber color={`${severityColors[severity]}.500`}>
                  {stats?.bySeverity?.[severity] || 0}
                </StatNumber>
              </Stat>
            ))}
          </HStack>

          {/* Risk level indicator */}
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" fontWeight="medium">Risk Level</Text>
              <Text fontSize="sm" color="gray.500">
                {criticalCount > 0 ? 'Critical' : 
                 highCount > 0 ? 'Elevated' : 
                 hasAnomalies ? 'Low' : 'Normal'}
              </Text>
            </HStack>
            <Progress
              value={
                criticalCount > 0 ? 100 :
                highCount > 0 ? 75 :
                hasAnomalies ? 25 : 0
              }
              colorScheme={
                criticalCount > 0 ? 'red' :
                highCount > 0 ? 'orange' :
                hasAnomalies ? 'yellow' : 'green'
              }
              size="sm"
              borderRadius="full"
            />
          </Box>

          {/* Recent anomalies */}
          {stats?.recentAnomalies && stats.recentAnomalies.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Recent Anomalies</Text>
              <VStack spacing={2} align="stretch">
                {stats.recentAnomalies.slice(0, 3).map((anomaly) => (
                  <HStack
                    key={anomaly.id}
                    p={2}
                    bg={useColorModeValue('gray.50', 'gray.700')}
                    borderRadius="md"
                    spacing={3}
                  >
                    <Icon
                      as={severityIcons[anomaly.severity]}
                      color={`${severityColors[anomaly.severity]}.500`}
                    />
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {anomaly.type.replace(/_/g, ' ')}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatDistanceToNow(new Date(anomaly.detectedAt), { addSuffix: true })}
                      </Text>
                    </Box>
                    <Badge colorScheme={severityColors[anomaly.severity]} fontSize="xs">
                      {anomaly.severity}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {!hasAnomalies && (
            <Box textAlign="center" py={2}>
              <Icon as={CheckCircleIcon} color="green.500" boxSize={6} mb={2} />
              <Text fontSize="sm" color="gray.500">
                No anomalies detected in the last 24 hours
              </Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
