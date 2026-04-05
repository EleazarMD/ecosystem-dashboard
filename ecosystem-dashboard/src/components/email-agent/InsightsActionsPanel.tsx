/**
 * Insights Actions Panel
 * Right panel for Email Insights page with quick actions
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  useToast,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  SparklesIcon,
  ArrowPathIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BellAlertIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use Hermes API via Next.js proxy
const HERMES_API_URL = '/api/hermes-proxy';

interface InsightsActionsPanelProps {
  customData?: {
    briefingStats?: {
      totalEmails: number;
      needsResponse: number;
      actionItems: number;
      lastGenerated?: string;
    };
  };
}

export default function InsightsActionsPanel({ customData }: InsightsActionsPanelProps) {
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ inbox: 0, sent: 0 });

  // Fetch stats on mount
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${HERMES_API_URL}?path=stats`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            inbox: data.indexed_emails?.inbox || 0,
            sent: data.indexed_emails?.sent || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleGenerateBriefing = async () => {
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        path: 'v1/intelligence/briefing/generate',
        account: 'all',
        period_hours: '24',
        include_podcast: 'true',
      });
      const response = await fetch(`${HERMES_API_URL}?${params.toString()}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate briefing');
      }
      toast({
        title: 'Briefing Generated',
        description: 'Your daily briefing has been updated',
        status: 'success',
        duration: 3000,
      });
      // Trigger DailyBriefingWidget refresh
      window.dispatchEvent(new CustomEvent('briefing-updated'));
      // Also reload the page to show new briefing
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Briefing generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefreshInsights = async () => {
    setRefreshing(true);
    try {
      // Fetch latest stats from Hermes Core
      // Note: Email sync is handled by Mac Agent, not via API
      const response = await fetch(`${HERMES_API_URL}?path=stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch email stats');
      }
      
      const stats = await response.json();
      
      toast({
        title: 'Insights Refreshed',
        description: `${stats.indexed_emails?.inbox || 0} inbox, ${stats.indexed_emails?.sent || 0} sent emails indexed`,
        status: 'success',
        duration: 3000,
      });
      
      // Trigger frontend refresh
      window.dispatchEvent(new CustomEvent('insights-refresh'));
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Could not reach Hermes',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setTimeout(() => setRefreshing(false), 2000);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        path: 'v1/intelligence/briefing/generate',
        account: 'all',
        period_hours: '168',
        include_podcast: 'true',
      });
      const response = await fetch(`${HERMES_API_URL}?${params.toString()}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate weekly report');
      }
      toast({
        title: 'Weekly Report Generated',
        description: 'Your 7-day briefing is ready',
        status: 'success',
        duration: 3000,
      });
      window.dispatchEvent(new CustomEvent('briefing-updated'));
      // Reload to show new briefing
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Weekly report generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box p={3} h="full" overflowY="auto">
      <VStack align="stretch" spacing={3}>
        {/* Header - Compact */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <SparklesIcon style={{ width: '16px', height: '16px', color: 'var(--chakra-colors-purple-500)' }} />
            <Text fontWeight="600" color={textColor} fontSize="sm">Insights Actions</Text>
          </HStack>
          <Badge colorScheme="purple" fontSize="2xs">AI</Badge>
        </HStack>

        <Divider borderColor={borderColor} />

        {/* Quick Actions */}
        <VStack align="stretch" spacing={2}>
          <Text fontSize="xs" fontWeight="500" color={textSecondary}>
            Generate Briefings
          </Text>
          
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<PlayIcon style={{ width: '14px', height: '14px' }} />}
            onClick={handleGenerateBriefing}
            isLoading={generating}
            loadingText="Generating..."
            w="full"
            fontSize="xs"
          >
            Generate Daily Briefing
          </Button>

          <Button
            size="sm"
            variant="outline"
            colorScheme="blue"
            leftIcon={<CalendarDaysIcon style={{ width: '14px', height: '14px' }} />}
            onClick={handleGenerateWeeklyReport}
            isLoading={generating}
            loadingText="Generating..."
            w="full"
            fontSize="xs"
          >
            Generate Weekly Report
          </Button>

          <Button
            size="sm"
            variant="ghost"
            leftIcon={<ArrowPathIcon style={{ width: '14px', height: '14px' }} />}
            onClick={handleRefreshInsights}
            isLoading={refreshing}
            loadingText="Syncing..."
            w="full"
            fontSize="xs"
          >
            Sync Emails
          </Button>
        </VStack>

        <Divider borderColor={borderColor} />

        {/* Quick Stats - Compact */}
        <Box>
          <Text fontSize="xs" fontWeight="500" color={textSecondary} mb={2}>
            Email Stats
          </Text>
          <SimpleGrid columns={2} spacing={2}>
            <Box p={2} bg={bgSubtle} borderRadius="md">
              <Text fontSize="lg" fontWeight="bold" color="blue.500">
                {stats.inbox}
              </Text>
              <Text fontSize="2xs" color={textSecondary}>Inbox</Text>
            </Box>
            <Box p={2} bg={bgSubtle} borderRadius="md">
              <Text fontSize="lg" fontWeight="bold" color="green.500">
                {stats.sent}
              </Text>
              <Text fontSize="2xs" color={textSecondary}>Sent</Text>
            </Box>
            <Box p={2} bg={bgSubtle} borderRadius="md">
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                {stats.inbox + stats.sent}
              </Text>
              <Text fontSize="2xs" color={textSecondary}>Total Indexed</Text>
            </Box>
            <Box p={2} bg={bgSubtle} borderRadius="md">
              <Text fontSize="2xs" color={textSecondary}>Last Synced</Text>
              <Text fontSize="xs" fontWeight="500" color={textColor}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Tips - Compact */}
        <Box p={2} bg="purple.50" borderRadius="md">
          <HStack spacing={1} mb={1}>
            <BellAlertIcon style={{ width: '12px', height: '12px', color: 'var(--chakra-colors-purple-600)' }} />
            <Text fontSize="xs" fontWeight="500" color="purple.700">Pro Tip</Text>
          </HStack>
          <Text fontSize="2xs" color="purple.600" lineHeight="1.4">
            Generate your daily briefing each morning to get an audio summary 
            perfect for your commute. Use the Audio tab to customize the voice.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}

export { InsightsActionsPanel };
