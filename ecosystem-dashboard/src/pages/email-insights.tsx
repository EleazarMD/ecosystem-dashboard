/**
 * Email Insights - Daily Briefing Page
 * 
 * Displays AI-generated daily email briefings with:
 * - Executive summary
 * - Action items requiring attention
 * - Topic clusters
 * - Key insights
 * 
 * @module pages/email-insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  useToast,
  IconButton,
  Tooltip,
  Progress,
  Divider,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  CalendarIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BriefingData {
  id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  account: string;
  headline: string;
  executive_summary: string;
  action_summary: string;
  metrics: {
    total_emails: number;
    needs_response: number;
    high_priority: number;
    response_rate: number;
    sentiment_label: string;
  };
  action_items: Array<{
    email_id: string;
    subject: string;
    from_name: string;
    priority: string;
    action_type: string;
    summary: string;
    deadline?: string;
  }>;
  insights: string[];
  topic_clusters: Array<{
    topic: string;
    email_count: number;
    priority: string;
  }>;
}

export default function EmailInsightsPage() {
  const toast = useToast();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  // Theme tokens
  const bgPrimary = useSemanticToken('bg.primary');
  const bgSecondary = useSemanticToken('bg.secondary');
  const bgElevated = useSemanticToken('bg.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const border = useSemanticToken('border.default');
  const accent = useSemanticToken('interactive.primary');

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      // Use Hermes Core intelligence endpoint directly
      const response = await fetch(`/api/hermes-proxy?path=v1/intelligence/briefing/latest&account=${selectedAccount}`);
      if (response.ok) {
        const data = await response.json();
        // Hermes Core returns briefing directly or in a wrapper
        const briefingData = data.briefing || data;
        if (briefingData.briefing_id || briefingData.id) {
          setBriefing({
            id: briefingData.briefing_id || briefingData.id,
            generated_at: briefingData.generated_at,
            period_start: briefingData.period_start,
            period_end: briefingData.period_end,
            account: briefingData.account || selectedAccount,
            headline: briefingData.headline || 'Daily Email Summary',
            executive_summary: briefingData.executive_summary || '',
            action_summary: briefingData.action_summary || '',
            metrics: briefingData.metrics || {
              total_emails: 0,
              needs_response: 0,
              high_priority: 0,
              response_rate: 0,
              sentiment_label: 'neutral',
            },
            action_items: (briefingData.action_items || []).map((item: any) => ({
              email_id: item.email_id,
              subject: item.subject,
              from_name: item.from_name || item.from_email,
              priority: item.priority,
              action_type: item.action_type,
              summary: item.summary,
              deadline: item.deadline,
            })),
            insights: briefingData.insights || [],
            topic_clusters: (briefingData.topic_clusters || []).map((t: any) => ({
              topic: t.topic,
              email_count: t.email_count,
              priority: t.priority,
            })),
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const generateBriefing = async () => {
    setGenerating(true);
    try {
      // Use Hermes Core briefing generation endpoint
      const response = await fetch(`/api/hermes-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `v1/intelligence/briefing/generate?account=${selectedAccount}&period_hours=24&include_podcast=true`,
          method: 'POST',
        }),
      });
      
      if (response.ok) {
        toast({
          title: 'Briefing generated',
          status: 'success',
          duration: 3000,
        });
        // Refresh to get the new briefing
        await fetchBriefing();
      }
    } catch (error) {
      console.error('Failed to generate briefing:', error);
      toast({
        title: 'Failed to generate briefing',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'green';
      case 'negative': return 'red';
      default: return 'gray';
    }
  };

  return (
    <DashboardLayout>
      <Box h="calc(100vh - 70px)" bg={bgPrimary} overflowY="auto" p={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <HStack spacing={4}>
            <IconButton
              aria-label="Back to email"
              icon={<ArrowLeftIcon style={{ width: '20px', height: '20px' }} />}
              variant="ghost"
              onClick={() => window.location.href = '/email'}
            />
            <Box>
              <Text fontSize="24px" fontWeight="600" color={textPrimary}>
                Daily Briefing
              </Text>
              <Text fontSize="14px" color={textSecondary}>
                AI-powered summary of your email activity
              </Text>
            </Box>
          </HStack>
          
          <HStack spacing={3}>
            <HStack spacing={2} bg={bgSecondary} p={1} borderRadius="md">
              {['all', 'icloud', 'work'].map((account) => (
                <Button
                  key={account}
                  size="sm"
                  variant={selectedAccount === account ? 'solid' : 'ghost'}
                  colorScheme={selectedAccount === account ? 'blue' : 'gray'}
                  onClick={() => setSelectedAccount(account)}
                  textTransform="capitalize"
                >
                  {account === 'all' ? 'All Accounts' : account}
                </Button>
              ))}
            </HStack>
            <Button
              leftIcon={<ArrowPathIcon style={{ width: '16px', height: '16px' }} />}
              onClick={generateBriefing}
              isLoading={generating}
              loadingText="Generating..."
              colorScheme="blue"
            >
              Generate New
            </Button>
          </HStack>
        </Flex>

        {loading ? (
          <Flex justify="center" align="center" h="400px">
            <VStack spacing={4}>
              <Spinner size="xl" color={accent} />
              <Text color={textSecondary}>Loading briefing...</Text>
            </VStack>
          </Flex>
        ) : !briefing ? (
          <Flex justify="center" align="center" h="400px">
            <VStack spacing={4}>
              <SparklesIcon style={{ width: '64px', height: '64px', color: textSecondary, opacity: 0.5 }} />
              <Text fontSize="18px" fontWeight="500" color={textPrimary}>
                No briefing available
              </Text>
              <Text color={textSecondary}>
                Generate a new briefing to see your email insights
              </Text>
              <Button
                colorScheme="blue"
                onClick={generateBriefing}
                isLoading={generating}
              >
                Generate Briefing
              </Button>
            </VStack>
          </Flex>
        ) : (
          <VStack spacing={6} align="stretch">
            {/* Headline Card */}
            <Box bg={bgElevated} p={6} borderRadius="lg" borderWidth="1px" borderColor={border}>
              <HStack spacing={2} mb={2}>
                <CalendarIcon style={{ width: '20px', height: '20px', color: textSecondary }} />
                <Text fontSize="12px" color={textSecondary}>
                  {new Date(briefing.generated_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </HStack>
              <Text fontSize="28px" fontWeight="700" color={textPrimary} mb={4}>
                {briefing.headline}
              </Text>
              <Text fontSize="16px" color={textSecondary} lineHeight="1.6">
                {briefing.executive_summary}
              </Text>
            </Box>

            {/* Metrics Row */}
            <Flex gap={4} wrap="wrap">
              <Box flex="1" minW="200px" bg={bgElevated} p={4} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="12px" color={textSecondary} textTransform="uppercase">
                    Total Emails
                  </Text>
                  <EnvelopeIcon style={{ width: '20px', height: '20px', color: textSecondary }} />
                </HStack>
                <Text fontSize="32px" fontWeight="700" color={textPrimary}>
                  {briefing.metrics.total_emails}
                </Text>
              </Box>
              
              <Box flex="1" minW="200px" bg={bgElevated} p={4} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="12px" color={textSecondary} textTransform="uppercase">
                    Needs Response
                  </Text>
                  <ExclamationCircleIcon style={{ width: '20px', height: '20px', color: 'orange' }} />
                </HStack>
                <Text fontSize="32px" fontWeight="700" color="orange.500">
                  {briefing.metrics.needs_response}
                </Text>
              </Box>
              
              <Box flex="1" minW="200px" bg={bgElevated} p={4} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="12px" color={textSecondary} textTransform="uppercase">
                    High Priority
                  </Text>
                  <ExclamationCircleIcon style={{ width: '20px', height: '20px', color: 'red' }} />
                </HStack>
                <Text fontSize="32px" fontWeight="700" color="red.500">
                  {briefing.metrics.high_priority}
                </Text>
              </Box>
              
              <Box flex="1" minW="200px" bg={bgElevated} p={4} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="12px" color={textSecondary} textTransform="uppercase">
                    Response Rate
                  </Text>
                  <CheckCircleIcon style={{ width: '20px', height: '20px', color: 'green' }} />
                </HStack>
                <Text fontSize="32px" fontWeight="700" color="green.500">
                  {Math.round(briefing.metrics.response_rate * 100)}%
                </Text>
              </Box>
            </Flex>

            {/* Action Items */}
            {briefing.action_items && briefing.action_items.length > 0 && (
              <Box bg={bgElevated} p={6} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack mb={4}>
                  <ClockIcon style={{ width: '20px', height: '20px', color: textSecondary }} />
                  <Text fontSize="18px" fontWeight="600" color={textPrimary}>
                    Action Items
                  </Text>
                  <Badge colorScheme="blue">{briefing.action_items.length}</Badge>
                </HStack>
                <Text fontSize="14px" color={textSecondary} mb={4}>
                  {briefing.action_summary}
                </Text>
                <VStack spacing={3} align="stretch">
                  {briefing.action_items.map((item, index) => (
                    <Box
                      key={index}
                      p={4}
                      bg={bgSecondary}
                      borderRadius="md"
                      borderLeft="4px solid"
                      borderLeftColor={`${getPriorityColor(item.priority)}.500`}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="14px" fontWeight="600" color={textPrimary}>
                          {item.subject}
                        </Text>
                        <Badge colorScheme={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                      </HStack>
                      <Text fontSize="13px" color={textSecondary} mb={2}>
                        From: {item.from_name}
                      </Text>
                      <Text fontSize="13px" color={textPrimary}>
                        {item.summary}
                      </Text>
                      {item.deadline && (
                        <HStack mt={2}>
                          <ClockIcon style={{ width: '14px', height: '14px', color: 'red' }} />
                          <Text fontSize="12px" color="red.500">
                            Due: {new Date(item.deadline).toLocaleDateString()}
                          </Text>
                        </HStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Topic Clusters */}
            {briefing.topic_clusters && briefing.topic_clusters.length > 0 && (
              <Box bg={bgElevated} p={6} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack mb={4}>
                  <ChartBarIcon style={{ width: '20px', height: '20px', color: textSecondary }} />
                  <Text fontSize="18px" fontWeight="600" color={textPrimary}>
                    Topic Clusters
                  </Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  {briefing.topic_clusters.map((cluster, index) => (
                    <Box key={index}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="14px" fontWeight="500" color={textPrimary}>
                          {cluster.topic}
                        </Text>
                        <Text fontSize="12px" color={textSecondary}>
                          {cluster.email_count} emails
                        </Text>
                      </HStack>
                      <Progress
                        value={(cluster.email_count / briefing.metrics.total_emails) * 100}
                        size="sm"
                        colorScheme={getPriorityColor(cluster.priority)}
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Insights */}
            {briefing.insights && briefing.insights.length > 0 && (
              <Box bg={bgElevated} p={6} borderRadius="lg" borderWidth="1px" borderColor={border}>
                <HStack mb={4}>
                  <SparklesIcon style={{ width: '20px', height: '20px', color: textSecondary }} />
                  <Text fontSize="18px" fontWeight="600" color={textPrimary}>
                    Key Insights
                  </Text>
                </HStack>
                <VStack spacing={3} align="stretch">
                  {briefing.insights.map((insight, index) => (
                    <HStack key={index} align="start" spacing={3}>
                      <Box w="6px" h="6px" borderRadius="full" bg={accent} mt={2} flexShrink={0} />
                      <Text fontSize="14px" color={textPrimary}>
                        {insight}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        )}
      </Box>
    </DashboardLayout>
  );
}
