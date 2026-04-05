'use client';

import React from 'react';
import {
  Box,
  Grid,
  GridItem,
  VStack,
  HStack,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Icon,
  Button,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  RepeatIcon,
  CheckCircleIcon,
  WarningIcon,
  TimeIcon,
  LockIcon,
} from '@chakra-ui/icons';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSecurityWebSocket } from '@/hooks/useSecurityWebSocket';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { RealTimeAlertFeed } from './RealTimeAlertFeed';
import { LiveAnomalyWidget } from './LiveAnomalyWidget';
import { LiveAuditStream } from './LiveAuditStream';

interface RealTimeSecurityDashboardProps {
  showAlerts?: boolean;
  showAnomalies?: boolean;
  showAuditStream?: boolean;
  showStats?: boolean;
}

export function RealTimeSecurityDashboard({
  showAlerts = true,
  showAnomalies = true,
  showAuditStream = true,
  showStats = true,
}: RealTimeSecurityDashboardProps) {
  const {
    status,
    clientId,
    alerts,
    anomalies,
    auditEvents,
    health,
    metrics,
    connect,
    disconnect,
    clearAlerts,
    clearAnomalies,
    clearAuditEvents,
  } = useSecurityWebSocket();

  const isConnected = status === 'connected';

  return (
    <VStack align="stretch" spacing={6} w="100%">
      {/* Header with Connection Status */}
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <HStack spacing={4}>
          <Icon as={LockIcon} color="purple.400" boxSize={6} />
          <VStack align="start" spacing={0}>
            <Heading size="md">Real-Time Security Monitor</Heading>
            <Text fontSize="sm" color="gray.400">
              Live updates from AI Gateway
            </Text>
          </VStack>
        </HStack>
        
        <HStack spacing={4}>
          <ConnectionStatusIndicator status={status} clientId={clientId} />
          
          {status === 'disconnected' || status === 'error' ? (
            <Button
              size="sm"
              leftIcon={<RepeatIcon />}
              colorScheme="purple"
              variant="outline"
              onClick={connect}
            >
              Reconnect
            </Button>
          ) : null}
        </HStack>
      </HStack>

      {/* Quick Stats Row */}
      {showStats && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <GlassPanel p={4}>
            <Stat size="sm">
              <StatLabel color="gray.400" fontSize="xs">Active Alerts</StatLabel>
              <StatNumber color={alerts.length > 0 ? 'red.400' : 'green.400'}>
                {alerts.length}
              </StatNumber>
              <StatHelpText fontSize="xs">
                {alerts.filter(a => a.severity === 'critical').length} critical
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel p={4}>
            <Stat size="sm">
              <StatLabel color="gray.400" fontSize="xs">Anomalies</StatLabel>
              <StatNumber color={anomalies.length > 5 ? 'orange.400' : 'green.400'}>
                {anomalies.length}
              </StatNumber>
              <StatHelpText fontSize="xs">
                Last 5 min: {anomalies.filter(a => 
                  Date.now() - new Date(a.detected_at).getTime() < 5 * 60 * 1000
                ).length}
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel p={4}>
            <Stat size="sm">
              <StatLabel color="gray.400" fontSize="xs">Audit Events</StatLabel>
              <StatNumber color="cyan.400">
                {auditEvents.length}
              </StatNumber>
              <StatHelpText fontSize="xs">
                {auditEvents.filter(e => e.outcome === 'denied').length} denied
              </StatHelpText>
            </Stat>
          </GlassPanel>
          
          <GlassPanel p={4}>
            <Stat size="sm">
              <StatLabel color="gray.400" fontSize="xs">System Health</StatLabel>
              <StatNumber>
                {health ? (
                  <Badge 
                    colorScheme={health.status === 'healthy' ? 'green' : 'orange'}
                    fontSize="sm"
                  >
                    {health.status}
                  </Badge>
                ) : (
                  <Badge colorScheme="gray" fontSize="sm">Unknown</Badge>
                )}
              </StatNumber>
              <StatHelpText fontSize="xs">
                {health ? `Uptime: ${Math.floor(health.uptime / 60)}m` : 'Waiting...'}
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </SimpleGrid>
      )}

      {/* Main Content Grid */}
      <Grid
        templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }}
        templateRows={{ base: 'auto', lg: 'repeat(2, minmax(300px, 400px))' }}
        gap={4}
      >
        {/* Alert Feed - Takes 2 rows on left */}
        {showAlerts && (
          <GridItem rowSpan={{ base: 1, lg: 2 }} minH="300px">
            <RealTimeAlertFeed
              alerts={alerts}
              onClear={clearAlerts}
              maxVisible={15}
            />
          </GridItem>
        )}
        
        {/* Anomaly Widget - Top middle */}
        {showAnomalies && (
          <GridItem minH="300px">
            <LiveAnomalyWidget
              anomalies={anomalies}
              onClear={clearAnomalies}
              maxVisible={8}
            />
          </GridItem>
        )}
        
        {/* Metrics Widget - Top right */}
        <GridItem minH="300px">
          <GlassPanel p={4} h="100%">
            <VStack align="stretch" spacing={4} h="100%">
              <HStack spacing={2}>
                <Icon as={TimeIcon} color="blue.400" />
                <Heading size="sm">Live Metrics</Heading>
              </HStack>
              
              <Divider borderColor="whiteAlpha.200" />
              
              <VStack align="stretch" spacing={4} flex={1}>
                {metrics ? (
                  <>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="gray.400">
                        Connected Clients
                      </StatLabel>
                      <StatNumber fontSize="2xl" color="blue.400">
                        {metrics.websocket?.connectedClients || 0}
                      </StatNumber>
                    </Stat>
                    
                    {metrics.requests && (
                      <>
                        <Stat size="sm">
                          <StatLabel fontSize="xs" color="gray.400">
                            Total Requests
                          </StatLabel>
                          <StatNumber fontSize="xl" color="gray.300">
                            {metrics.requests.total.toLocaleString()}
                          </StatNumber>
                          <StatHelpText fontSize="xs">
                            <HStack spacing={2}>
                              <Badge colorScheme="green" fontSize="2xs">
                                {metrics.requests.success} ok
                              </Badge>
                              <Badge colorScheme="red" fontSize="2xs">
                                {metrics.requests.failed} failed
                              </Badge>
                            </HStack>
                          </StatHelpText>
                        </Stat>
                      </>
                    )}
                  </>
                ) : (
                  <VStack py={8} spacing={2}>
                    <Icon as={TimeIcon} color="gray.500" boxSize={6} />
                    <Text color="gray.500" fontSize="sm">
                      {isConnected ? 'Waiting for metrics...' : 'Not connected'}
                    </Text>
                  </VStack>
                )}
              </VStack>
            </VStack>
          </GlassPanel>
        </GridItem>
        
        {/* Audit Stream - Bottom, spans 2 columns */}
        {showAuditStream && (
          <GridItem colSpan={{ base: 1, lg: 2 }} minH="300px">
            <LiveAuditStream
              events={auditEvents}
              onClear={clearAuditEvents}
              maxVisible={20}
            />
          </GridItem>
        )}
      </Grid>
    </VStack>
  );
}
