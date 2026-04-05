/**
 * AHIS Status Widget Component
 * 
 * Displays real-time AHIS connection status and health information
 * Phase 1 implementation of AHIS integration
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Spinner,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tooltip,
  Icon
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui';
import { useAHISClient } from '@/lib/ahis-client-provider';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// AHIS Health interface
interface AHISHealthData {
  status: string;
  version: string;
  uptime: number;
  healthScore: number;
  dependencies: {
    database: { status: string };
    'port-registry': { status: string };
    'project-registry': { status: string };
  };
  responseTime: number;
  lastChecked: string;
  error?: string;
  usingMockData?: boolean;
}

interface AHISStatusWidgetProps {
  variant?: 'compact' | 'detailed';
  showMetrics?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AHISStatusWidget: React.FC<AHISStatusWidgetProps> = ({
  variant = 'compact',
  showMetrics = true,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [healthData, setHealthData] = useState<AHISHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const { client, isConnected, isLoading: clientLoading, error: connectionError, connectionStatus } = useAHISClient();
  const isDark = false;

  // Fetch AHIS health data
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      // If client is available, use it. Otherwise, fetch directly from API
      let health: any;
      
      if (client) {
        health = await client.getHealth();
      } else {
        // Fetch directly from the health API endpoint
        const response = await fetch('/api/ahis/health');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        health = await response.json();
      }
      
      // Transform API response to component format
      const healthData: AHISHealthData = {
        status: health.status || 'unknown',
        version: health.version || '1.0.0',
        uptime: health.uptime || 0,
        healthScore: health.healthScore || 0,
        dependencies: {
          database: { status: health.dependencies?.database?.status || 'unknown' },
          'port-registry': { status: health.dependencies?.['port-registry']?.status || 'unknown' },
          'project-registry': { status: health.dependencies?.['project-registry']?.status || 'unknown' }
        },
        responseTime: health.responseTime || 0,
        lastChecked: health.lastChecked || new Date().toISOString(),
        usingMockData: false // We have real data from AHIS server
      };
      
      setHealthData(healthData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch AHIS health:', error);
      // Set error state but don't clear existing data
      if (!healthData) {
        setHealthData({
          status: 'error',
          version: 'unknown',
          uptime: 0,
          healthScore: 0,
          dependencies: {
            database: { status: 'unknown' },
            'port-registry': { status: 'unknown' },
            'project-registry': { status: 'unknown' }
          },
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          usingMockData: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHealthData();
  }, [client]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, client]);

  // Helper functions
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'ok':
      case 'healthy':
      case 'running':
        return 'green';
      case 'warning':
      case 'degraded':
        return 'yellow';
      case 'error':
      case 'failed':
      case 'offline':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  if (variant === 'compact') {
    return (
      <GlassPanel variant={isDark ? "medium" : "light"} p={4}>
        <HStack spacing={4} align="center">
          {/* Connection Status */}
          <VStack spacing={1} align="start">
            <HStack spacing={2}>
              {connectionStatus === 'connecting' && <Spinner size="xs" />}
              <Text fontSize="sm" fontWeight="medium">
                AHIS Server
              </Text>
              <Badge 
                colorScheme={isConnected ? 'green' : connectionError ? 'red' : 'gray'}
                variant="solid"
                size="sm"
              >
                {isConnected ? 'Connected' : connectionError ? 'Error' : 'Disconnected'}
              </Badge>
            </HStack>
            
            {healthData && (
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                Health: {healthData.healthScore}% • 
                {healthData.usingMockData ? ' Mock Data' : ` v${healthData.version}`}
              </Text>
            )}
          </VStack>

          {/* Health Score */}
          {showMetrics && healthData && (
            <Box minW="80px">
              <Progress 
                value={healthData.healthScore} 
                colorScheme={getHealthScoreColor(healthData.healthScore)}
                size="sm"
                borderRadius="md"
              />
            </Box>
          )}
        </HStack>
      </GlassPanel>
    );
  }

  // Detailed variant
  return (
    <GlassPanel variant={isDark ? "medium" : "light"} p={6}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            {connectionStatus === 'connecting' && <Spinner size="sm" />}
            <Text fontSize="lg" fontWeight="semibold">
              AHIS Infrastructure Status
            </Text>
            <Badge 
              colorScheme={isConnected ? 'green' : connectionError ? 'red' : 'gray'}
              variant="solid"
            >
              {isConnected ? 'Connected' : connectionError ? 'Error' : 'Disconnected'}
            </Badge>
          </HStack>
          
          {lastUpdate && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </HStack>

        {/* Loading State */}
        {loading && !healthData && (
          <Box textAlign="center" py={4}>
            <Spinner size="lg" />
            <Text mt={2} color={useSemanticToken('text.secondary')}>Loading AHIS status...</Text>
          </Box>
        )}

        {/* Health Data */}
        {healthData && (
          <VStack spacing={4} align="stretch">
            {/* Main Stats */}
            <HStack spacing={6} justify="space-around">
              <Stat textAlign="center">
                <StatLabel>Status</StatLabel>
                <StatNumber>
                  <Badge 
                    colorScheme={getStatusColor(healthData.status)} 
                    variant="solid"
                    fontSize="md"
                    px={3}
                    py={1}
                  >
                    {healthData.status.toUpperCase()}
                  </Badge>
                </StatNumber>
              </Stat>

              <Stat textAlign="center">
                <StatLabel>Health Score</StatLabel>
                <StatNumber color={`${getHealthScoreColor(healthData.healthScore)}.500`}>
                  {healthData.healthScore}%
                </StatNumber>
                <StatHelpText>
                  <StatArrow type={healthData.healthScore > 75 ? 'increase' : 'decrease'} />
                  System Health
                </StatHelpText>
              </Stat>

              <Stat textAlign="center">
                <StatLabel>Uptime</StatLabel>
                <StatNumber fontSize="lg">
                  {formatUptime(healthData.uptime)}
                </StatNumber>
                <StatHelpText>
                  Response: {healthData.responseTime}ms
                </StatHelpText>
              </Stat>
            </HStack>

            {/* Dependencies */}
            {showMetrics && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Dependencies Status
                </Text>
                <HStack spacing={4} justify="space-around">
                  {Object.entries(healthData.dependencies).map(([name, dep]) => (
                    <VStack key={name} spacing={1}>
                      <Text fontSize="xs" textTransform="capitalize">
                        {name.replace('-', ' ')}
                      </Text>
                      <Badge 
                        colorScheme={getStatusColor(dep.status)} 
                        variant="solid"
                        size="sm"
                      >
                        {dep.status}
                      </Badge>
                    </VStack>
                  ))}
                </HStack>
              </Box>
            )}

            {/* Error/Warning Messages */}
            {healthData.error && (
              <Box 
                p={3} 
                bg={isDark ? "red.900" : "red.50"} 
                borderRadius="md"
                border="1px solid"
                borderColor={isDark ? "red.700" : "red.200"}
              >
                <Text fontSize="sm" color={isDark ? "red.200" : "red.800"}>
                  ⚠️ {healthData.error}
                </Text>
              </Box>
            )}

            {healthData.usingMockData && (
              <Box 
                p={3} 
                bg={isDark ? "yellow.900" : "yellow.50"} 
                borderRadius="md"
                border="1px solid"
                borderColor={isDark ? "yellow.700" : "yellow.200"}
              >
                <Text fontSize="sm" color={isDark ? "yellow.200" : "yellow.800"}>
                  ℹ️ Using mock data - AHIS server may be unavailable
                </Text>
              </Box>
            )}
          </VStack>
        )}

        {/* Connection Error */}
        {connectionError && !healthData && (
          <Box 
            p={4} 
            bg={isDark ? "red.900" : "red.50"} 
            borderRadius="md"
            textAlign="center"
          >
            <Text color={isDark ? "red.200" : "red.800"}>
              Failed to connect to AHIS server
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
              {typeof connectionError === 'string' ? connectionError : (connectionError as any)?.message || 'Unknown error'}
            </Text>
          </Box>
        )}
      </VStack>
    </GlassPanel>
  );
};

export default AHISStatusWidget;
