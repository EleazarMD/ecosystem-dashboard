/**
 * Admin Security Panel
 * Right panel content for security overview, audit logs, and alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Button,
} from '@chakra-ui/react';
import {
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiExternalLink,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface SecurityStats {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  auditEventsToday: number;
  failedLogins: number;
  suspiciousActivity: number;
}

interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  outcome: 'success' | 'failure' | 'warning';
}

export default function AdminSecurityPanel() {
  const { activeTab } = useRightPanel();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setStats({
        totalAlerts: 3,
        criticalAlerts: 0,
        resolvedToday: 5,
        auditEventsToday: 127,
        failedLogins: 2,
        suspiciousActivity: 0,
      });
      setAuditEvents([
        { id: '1', action: 'User login', actor: 'eleazar@example.com', timestamp: '2 min ago', outcome: 'success' },
        { id: '2', action: 'API key created', actor: 'admin', timestamp: '15 min ago', outcome: 'success' },
        { id: '3', action: 'Failed login attempt', actor: 'unknown', timestamp: '1 hour ago', outcome: 'failure' },
        { id: '4', action: 'Settings updated', actor: 'eleazar@example.com', timestamp: '2 hours ago', outcome: 'success' },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return <Badge colorScheme="green" size="sm">Success</Badge>;
      case 'failure':
        return <Badge colorScheme="red" size="sm">Failed</Badge>;
      case 'warning':
        return <Badge colorScheme="orange" size="sm">Warning</Badge>;
      default:
        return <Badge size="sm">{outcome}</Badge>;
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading security data...</Text>
      </Box>
    );
  }

  // Overview Tab
  if (activeTab === 'security-overview') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">Security Overview</Text>
          <Badge colorScheme={stats?.criticalAlerts === 0 ? 'green' : 'red'}>
            {stats?.criticalAlerts === 0 ? 'All Clear' : `${stats?.criticalAlerts} Critical`}
          </Badge>
        </HStack>

        <Divider />

        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Active Alerts</StatLabel>
            <StatNumber fontSize="xl" color={stats?.totalAlerts ? 'orange.500' : 'green.500'}>
              {stats?.totalAlerts || 0}
            </StatNumber>
            <StatHelpText fontSize="xs">
              <Icon as={FiAlertTriangle} mr={1} />
              {stats?.criticalAlerts} critical
            </StatHelpText>
          </Stat>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Resolved Today</StatLabel>
            <StatNumber fontSize="xl" color="green.500">{stats?.resolvedToday || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              <Icon as={FiCheckCircle} mr={1} />
              issues fixed
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        <Box p={3} bg={bgSubtle} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" fontWeight="medium">Quick Stats</Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Audit Events Today</Text>
              <Text fontSize="xs" fontWeight="bold">{stats?.auditEventsToday}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Failed Logins</Text>
              <Text fontSize="xs" fontWeight="bold" color={stats?.failedLogins ? 'orange.500' : undefined}>
                {stats?.failedLogins}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Suspicious Activity</Text>
              <Text fontSize="xs" fontWeight="bold" color={stats?.suspiciousActivity ? 'red.500' : 'green.500'}>
                {stats?.suspiciousActivity || 'None'}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Button
          as={NextLink}
          href="/security"
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          Open Security Dashboard
        </Button>
      </VStack>
    );
  }

  // Audit Logs Tab
  if (activeTab === 'audit-logs') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Recent Audit Events</Text>
          <Badge>{auditEvents.length}</Badge>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          {auditEvents.map((event) => (
            <Box key={event.id} p={3} bg={bgSubtle} borderRadius="md">
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm" fontWeight="medium">{event.action}</Text>
                {getOutcomeBadge(event.outcome)}
              </HStack>
              <HStack justify="space-between">
                <HStack spacing={1}>
                  <Icon as={FiUser} boxSize={3} color={textSecondary} />
                  <Text fontSize="xs" color={textSecondary}>{event.actor}</Text>
                </HStack>
                <HStack spacing={1}>
                  <Icon as={FiClock} boxSize={3} color={textSecondary} />
                  <Text fontSize="xs" color={textSecondary}>{event.timestamp}</Text>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>

        <Button
          as={NextLink}
          href="/security/audit"
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          View All Audit Logs
        </Button>
      </VStack>
    );
  }

  // Alerts Tab
  if (activeTab === 'alerts') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Active Alerts</Text>
          <Badge colorScheme={stats?.totalAlerts ? 'orange' : 'green'}>
            {stats?.totalAlerts || 0}
          </Badge>
        </HStack>
        
        {stats?.totalAlerts === 0 ? (
          <Box p={6} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiCheckCircle} boxSize={10} color="green.400" mb={3} />
            <Text fontWeight="medium" mb={1}>All Clear</Text>
            <Text fontSize="sm" color={textSecondary}>
              No active security alerts
            </Text>
          </Box>
        ) : (
          <VStack spacing={2} align="stretch">
            <Box p={3} bg="orange.50" _dark={{ bg: 'orange.900' }} borderRadius="md" borderLeft="3px solid" borderColor="orange.400">
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm" fontWeight="medium">Rate Limit Warning</Text>
                <Badge colorScheme="orange" size="sm">Warning</Badge>
              </HStack>
              <Text fontSize="xs" color={textSecondary}>
                High API usage detected from dashboard-main
              </Text>
            </Box>
          </VStack>
        )}

        <Button
          as={NextLink}
          href="/security/alerts"
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          Manage Alerts
        </Button>
      </VStack>
    );
  }

  return null;
}
