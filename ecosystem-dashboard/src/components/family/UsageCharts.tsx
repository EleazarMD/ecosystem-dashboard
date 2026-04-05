/**
 * Usage Charts Component
 * 
 * Displays usage analytics charts for child monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface UsageChartsProps {
  childId: string;
}

interface UsageSummary {
  totalActivities: number;
  flaggedCount: number;
  unreviewedFlagged: number;
  byType: Record<string, number>;
  byService: Record<string, number>;
}

export default function UsageCharts({ childId }: UsageChartsProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');

  useEffect(() => {
    fetchSummary();
  }, [childId, period]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
      }

      const params = new URLSearchParams({
        childId,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      });

      const res = await fetch(`/api/activities/summary?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast({
        title: 'Error loading analytics',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">No data available</Text>
      </Box>
    );
  }

  const activityTypeLabels: Record<string, string> = {
    page_view: 'Page Views',
    search: 'Searches',
    message: 'Messages',
    image_generation: 'Images',
    blocked_attempt: 'Blocked',
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Period Selector */}
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">Usage Analytics</Text>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          maxW="150px"
          size="sm"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </Select>
      </HStack>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box bg={cardBg} p={4} borderRadius="lg">
          <Stat>
            <StatLabel>Total Activities</StatLabel>
            <StatNumber>{summary.totalActivities}</StatNumber>
            <StatHelpText>All tracked actions</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} p={4} borderRadius="lg">
          <Stat>
            <StatLabel>Flagged Items</StatLabel>
            <StatNumber color="orange.500">{summary.flaggedCount}</StatNumber>
            <StatHelpText>
              {summary.unreviewedFlagged > 0 && (
                <Text as="span" color="orange.500">
                  {summary.unreviewedFlagged} need review
                </Text>
              )}
              {summary.unreviewedFlagged === 0 && 'All reviewed'}
            </StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} p={4} borderRadius="lg">
          <Stat>
            <StatLabel>Blocked Attempts</StatLabel>
            <StatNumber color="red.500">
              {summary.byType.blocked_attempt || 0}
            </StatNumber>
            <StatHelpText>Access denied</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Activity Breakdown */}
      <Box bg={cardBg} p={4} borderRadius="lg">
        <Text fontWeight="bold" mb={3}>Activity Breakdown</Text>
        <VStack spacing={2} align="stretch">
          {Object.entries(summary.byType).map(([type, count]) => (
            <HStack key={type} justify="space-between">
              <Text fontSize="sm">{activityTypeLabels[type] || type}</Text>
              <HStack>
                <Box
                  w={`${Math.min((count / summary.totalActivities) * 200, 200)}px`}
                  h="20px"
                  bg="blue.400"
                  borderRadius="md"
                />
                <Text fontSize="sm" fontWeight="bold" minW="40px" textAlign="right">
                  {count}
                </Text>
              </HStack>
            </HStack>
          ))}
        </VStack>
      </Box>

      {/* Service Usage */}
      {Object.keys(summary.byService).length > 0 && (
        <Box bg={cardBg} p={4} borderRadius="lg">
          <Text fontWeight="bold" mb={3}>Service Usage</Text>
          <VStack spacing={2} align="stretch">
            {Object.entries(summary.byService)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([service, count]) => (
                <HStack key={service} justify="space-between">
                  <Text fontSize="sm" textTransform="capitalize">{service}</Text>
                  <HStack>
                    <Box
                      w={`${Math.min((count / summary.totalActivities) * 200, 200)}px`}
                      h="20px"
                      bg="green.400"
                      borderRadius="md"
                    />
                    <Text fontSize="sm" fontWeight="bold" minW="40px" textAlign="right">
                      {count}
                    </Text>
                  </HStack>
                </HStack>
              ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
