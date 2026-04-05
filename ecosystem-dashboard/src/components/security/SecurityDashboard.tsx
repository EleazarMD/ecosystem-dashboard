'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  VStack,
  HStack,
  Badge,
  Icon,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  WarningIcon,
  LockIcon,
  TimeIcon,
} from '@chakra-ui/icons';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ApprovalsList } from './ApprovalsList';
import { SecurityAuditLog } from './SecurityAuditLog';

interface SecurityStats {
  pendingApprovals: number;
  approvedToday: number;
  deniedToday: number;
  blockedAttempts: number;
  rateLimitHits: number;
  contentFiltered: number;
}

interface SecurityDashboardProps {
  showApprovals?: boolean;
  showAuditLog?: boolean;
  showStats?: boolean;
}

export function SecurityDashboard({
  showApprovals = true,
  showAuditLog = true,
  showStats = true,
}: SecurityDashboardProps) {
  const [stats, setStats] = useState<SecurityStats>({
    pendingApprovals: 0,
    approvedToday: 0,
    deniedToday: 0,
    blockedAttempts: 0,
    rateLimitHits: 0,
    contentFiltered: 0,
  });
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch pending approvals count
        const approvalsRes = await fetch('/api/security/approvals?status=pending&limit=1');
        if (approvalsRes.ok) {
          const data = await approvalsRes.json();
          setStats(prev => ({ ...prev, pendingApprovals: data.total }));
        }

        // Fetch today's audit stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const auditRes = await fetch(`/api/security/audit-log?startDate=${today.toISOString()}&limit=1000`);
        if (auditRes.ok) {
          const data = await auditRes.json();
          const events = data.events || [];
          
          setStats(prev => ({
            ...prev,
            approvedToday: events.filter((e: any) => e.action?.includes('approved')).length,
            deniedToday: events.filter((e: any) => e.action?.includes('denied')).length,
            blockedAttempts: events.filter((e: any) => e.outcome === 'blocked').length,
            rateLimitHits: events.filter((e: any) => e.eventType === 'rate_limit').length,
            contentFiltered: events.filter((e: any) => e.eventType === 'content_filter').length,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch security stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between">
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={LockIcon} boxSize={6} />
                <Heading size="lg">Security Dashboard</Heading>
              </HStack>
              <Text color={textSecondary}>
                Real-time security monitoring and threat detection
              </Text>
            </VStack>
            <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
              Protected
            </Badge>
          </HStack>
        </GlassPanel>

        {showStats && (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }} gap={4}>
            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Pending Approvals</StatLabel>
                  <StatNumber color={stats.pendingApprovals > 0 ? 'orange.500' : 'green.500'}>
                    {stats.pendingApprovals}
                  </StatNumber>
                  <StatHelpText>
                    {stats.pendingApprovals > 0 ? (
                      <HStack spacing={1}>
                        <TimeIcon />
                        <Text>Needs attention</Text>
                      </HStack>
                    ) : (
                      <HStack spacing={1}>
                        <CheckCircleIcon color="green.500" />
                        <Text>All clear</Text>
                      </HStack>
                    )}
                  </StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>

            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Approved Today</StatLabel>
                  <StatNumber color="green.500">{stats.approvedToday}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    Tool executions
                  </StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>

            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Denied Today</StatLabel>
                  <StatNumber color="red.500">{stats.deniedToday}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="decrease" />
                    Blocked requests
                  </StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>

            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Blocked Attempts</StatLabel>
                  <StatNumber color="orange.500">{stats.blockedAttempts}</StatNumber>
                  <StatHelpText>
                    <WarningIcon mr={1} />
                    Security blocks
                  </StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>

            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Rate Limit Hits</StatLabel>
                  <StatNumber>{stats.rateLimitHits}</StatNumber>
                  <StatHelpText>Throttled requests</StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>

            <GridItem>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Content Filtered</StatLabel>
                  <StatNumber>{stats.contentFiltered}</StatNumber>
                  <StatHelpText>Injection attempts</StatHelpText>
                </Stat>
              </GlassPanel>
            </GridItem>
          </Grid>
        )}

        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
          {showApprovals && (
            <GridItem>
              <GlassPanel variant="light" p={6}>
                <Heading size="md" mb={4}>Pending Approvals</Heading>
                <ApprovalsList autoRefresh={true} refreshInterval={5000} />
              </GlassPanel>
            </GridItem>
          )}

          {showAuditLog && (
            <GridItem>
              <GlassPanel variant="light" p={6}>
                <Heading size="md" mb={4}>Recent Security Events</Heading>
                <SecurityAuditLog autoRefresh={true} refreshInterval={10000} limit={20} />
              </GlassPanel>
            </GridItem>
          )}
        </Grid>
      </VStack>
    </Box>
  );
}
