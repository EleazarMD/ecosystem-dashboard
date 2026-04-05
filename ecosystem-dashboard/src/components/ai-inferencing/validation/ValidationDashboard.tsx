/**
 * Validation Dashboard Component
 * Collapsible panel showing health metrics, quick stats, and validation history
 * Integrates into KeyDetailsPanel
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Collapse,
  Divider,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiCalendar,
  FiBarChart2,
  FiActivity,
} from 'react-icons/fi';
import { HealthScoreBadge } from './HealthScoreBadge';
import { ValidationQuickStats } from './ValidationQuickStats';
import { ValidationHistoryTimeline } from './ValidationHistoryTimeline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HealthMetrics {
  health_score: number;
  status: string;
  success_rate: number;
  avg_response_time_ms: number;
  consecutive_failures: number;
  last_checked: string;
  last_success: string;
  last_failure: string;
  total_checks: number;
}

interface ValidationDashboardProps {
  keyId: string;
  onSchedule?: () => void;
  onViewFullHistory?: () => void;
}

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

export function ValidationDashboard({
  keyId,
  onSchedule,
  onViewFullHistory,
}: ValidationDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const hoverBg = useSemanticToken('surface.hover');
  const iconColor = useSemanticToken('text.secondary');
  const mutedText = useSemanticToken('text.secondary');

  // Fetch health metrics and history
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch health metrics
      const healthRes = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/health`,
        {
          headers: { 'X-Admin-Key': ADMIN_KEY },
        }
      );

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData.health);
      }

      // Fetch validation history
      const historyRes = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/validation-history?limit=10`,
        {
          headers: { 'X-Admin-Key': ADMIN_KEY },
        }
      );

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keyId]);

  // Handle test validation
  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/validate`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ triggeredBy: 'user' }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: result.valid ? 'Validation Successful' : 'Validation Failed',
          description: result.errorMessage || `Response time: ${result.responseTime}ms`,
          status: result.valid ? 'success' : 'error',
          duration: 3000,
        });

        // Refresh data
        await fetchData();
      } else {
        throw new Error(result.error || 'Validation failed');
      }
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setTesting(false);
    }
  };

  // Collapsed state - compact view
  const renderCollapsed = () => (
    <HStack spacing={4} p={3} justify="space-between">
      <HStack spacing={3} flex={1}>
        <HealthScoreBadge
          score={health?.health_score || 0}
          size="sm"
          lastChecked={health?.last_checked}
          successRate={health?.success_rate}
          avgResponseTime={health?.avg_response_time_ms}
        />
        <VStack align="start" spacing={0} flex={1}>
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="bold">
              Score: {health?.health_score || 0}/100
            </Text>
            <Text fontSize="xs" color={mutedText}>|</Text>
            <Text fontSize="xs" color={mutedText}>
              Status: {health?.status || 'Unknown'}
            </Text>
          </HStack>
          <HStack spacing={2} fontSize="xs" color={mutedText}>
            <Text>Last: {formatTimeAgo(health?.last_checked)}</Text>
            <Text>•</Text>
            <Text>Success: {health?.success_rate?.toFixed(0) || 0}%</Text>
          </HStack>
        </VStack>
      </HStack>

      <HStack spacing={2}>
        <Button
          size="sm"
          leftIcon={<FiRefreshCw />}
          onClick={handleTest}
          isLoading={testing}
          colorScheme="blue"
          variant="ghost"
        >
          Test
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewFullHistory?.()}
        >
          History
        </Button>
      </HStack>
    </HStack>
  );

  // Expanded state - detailed view
  const renderExpanded = () => (
    <VStack spacing={4} p={4} align="stretch">
      {/* Health Score & Stats */}
      <HStack spacing={6} align="start">
        <HealthScoreBadge
          score={health?.health_score || 0}
          size="lg"
          showLabel
          lastChecked={health?.last_checked}
          successRate={health?.success_rate}
          avgResponseTime={health?.avg_response_time_ms}
        />

        <Box flex={1}>
          <VStack align="stretch" spacing={1} mb={2}>
            <Text fontSize="lg" fontWeight="bold">
              {health?.status || 'Unknown'}
            </Text>
            <Text fontSize="sm" color={mutedText}>
              {getStatusDescription(health?.status)}
            </Text>
          </VStack>

          <ValidationQuickStats
            successRate={health?.success_rate || 0}
            avgResponseTime={health?.avg_response_time_ms || 0}
            lastSuccess={health?.last_success}
            lastFailure={health?.last_failure}
            consecutiveFailures={health?.consecutive_failures}
          />
        </Box>
      </HStack>

      {/* Action Buttons */}
      <HStack spacing={2}>
        <Button
          size="sm"
          leftIcon={<FiRefreshCw />}
          onClick={handleTest}
          isLoading={testing}
          colorScheme="blue"
          flex={1}
        >
          Test Now
        </Button>
        <Button
          size="sm"
          leftIcon={<FiCalendar />}
          onClick={onSchedule}
          variant="outline"
          flex={1}
        >
          Schedule
        </Button>
        <Button
          size="sm"
          leftIcon={<FiBarChart2 />}
          onClick={onViewFullHistory}
          variant="outline"
          flex={1}
        >
          Full Report
        </Button>
      </HStack>

      <Divider />

      {/* Recent History */}
      <ValidationHistoryTimeline
        history={history}
        limit={5}
        onViewAll={onViewFullHistory}
      />
    </VStack>
  );

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getStatusDescription = (status?: string) => {
    switch (status) {
      case 'healthy': return 'Everything working perfectly';
      case 'degraded': return 'Some recent failures detected';
      case 'critical': return 'Frequent failures, attention needed';
      case 'failed': return 'Key is not working';
      default: return 'No validation data yet';
    }
  };

  if (loading && !health) {
    return (
      <Box
        bg={cardBg}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        p={4}
      >
        <HStack justify="center">
          <Spinner size="sm" />
          <Text fontSize="sm" color={mutedText}>
            Loading health metrics...
          </Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Box
      bg={cardBg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        p={3}
        bg={headerBg}
        justify="space-between"
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: hoverBg }}
        transition="background 0.2s"
      >
        <HStack spacing={2}>
          <FiActivity size={16} color={iconColor} />
          <Text fontSize="sm" fontWeight="bold">
            KEY HEALTH & VALIDATION
          </Text>
        </HStack>
        <IconButton
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          size="sm"
          variant="ghost"
        />
      </HStack>

      {/* Content */}
      {!isExpanded && renderCollapsed()}
      
      <Collapse in={isExpanded} animateOpacity>
        {renderExpanded()}
      </Collapse>
    </Box>
  );
}

export default ValidationDashboard;
