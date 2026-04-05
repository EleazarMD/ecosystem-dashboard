/**
 * Platform Overview Widget
 * High-level metrics for AIHomelab administrators
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiServer,
  FiCpu,
  FiDatabase,
  FiActivity,
  FiZap,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  totalRequests: number;
  requestsChange: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsed: number;
  storageTotal: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function PlatformOverviewWidget() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchPlatformMetrics();
    const interval = setInterval(fetchPlatformMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPlatformMetrics = async () => {
    try {
      const res = await fetch('/api/admin/platform/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch platform metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading platform metrics...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const storagePercent = metrics ? (metrics.storageUsed / metrics.storageTotal) * 100 : 0;

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiServer} boxSize={5} color="blue.500" />
            <Text fontSize="lg" fontWeight="bold">Platform Overview</Text>
          </HStack>
          <Badge colorScheme={getHealthColor(metrics?.systemHealth || 'healthy')}>
            {metrics?.systemHealth || 'Unknown'}
          </Badge>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiUsers} boxSize={3} />
                <Text>Total Users</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{metrics?.totalUsers || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              {metrics?.activeUsers || 0} active
            </StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiServer} boxSize={3} />
                <Text>Tenants</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{metrics?.totalTenants || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              {metrics?.activeTenants || 0} active
            </StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiActivity} boxSize={3} />
                <Text>Requests</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{metrics?.totalRequests?.toLocaleString() || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              <StatArrow type={metrics && metrics.requestsChange >= 0 ? 'increase' : 'decrease'} />
              {Math.abs(metrics?.requestsChange || 0)}%
            </StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiCpu} boxSize={3} />
                <Text>CPU</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{metrics?.cpuUsage || 0}%</StatNumber>
            <Progress
              value={metrics?.cpuUsage || 0}
              size="xs"
              colorScheme={(metrics?.cpuUsage || 0) > 80 ? 'red' : 'green'}
              mt={1}
            />
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiZap} boxSize={3} />
                <Text>Memory</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{metrics?.memoryUsage || 0}%</StatNumber>
            <Progress
              value={metrics?.memoryUsage || 0}
              size="xs"
              colorScheme={(metrics?.memoryUsage || 0) > 80 ? 'red' : 'green'}
              mt={1}
            />
          </Stat>

          <Stat size="sm">
            <StatLabel fontSize="xs" color={textSecondary}>
              <HStack spacing={1}>
                <Icon as={FiDatabase} boxSize={3} />
                <Text>Storage</Text>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="2xl">{storagePercent.toFixed(0)}%</StatNumber>
            <Progress
              value={storagePercent}
              size="xs"
              colorScheme={storagePercent > 80 ? 'red' : 'green'}
              mt={1}
            />
          </Stat>
        </SimpleGrid>
      </VStack>
    </GlassPanel>
  );
}
