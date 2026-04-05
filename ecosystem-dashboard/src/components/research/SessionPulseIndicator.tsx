/**
 * Session Pulse Indicator
 * Shows real-time proof-of-life for research sessions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Text,
  Tooltip,
  Badge,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import { FiActivity, FiAlertCircle, FiClock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PulseData {
  lastVerifiedAt: string | null;
  secondsSinceVerification: number;
  openaiStatus: string | null;
  health: 'healthy' | 'warning' | 'stale' | 'unknown';
  metadata?: any;
}

interface SessionPulseIndicatorProps {
  sessionId: string;
  status: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export default function SessionPulseIndicator({
  sessionId,
  status,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
}: SessionPulseIndicatorProps) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulse = async () => {
    try {
      const res = await fetch(`/api/research-lab/session/pulse?sessionId=${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch pulse');
      
      const data = await res.json();
      setPulse(data.pulse);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPulse();

    // Auto-refresh for in-progress sessions
    if (autoRefresh && (status === 'in_progress' || status === 'queued')) {
      const interval = setInterval(fetchPulse, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [sessionId, status, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
        <Spinner size="xs" />
        <Text>Checking...</Text>
      </HStack>
    );
  }

  if (error || !pulse) {
    return (
      <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.tertiary')}>
        <Icon as={FiAlertCircle} />
        <Text>Status unknown</Text>
      </HStack>
    );
  }

  // Status is completed or failed - no pulse needed
  if (status === 'completed' || status === 'failed') {
    return null;
  }

  const getHealthColor = () => {
    switch (pulse.health) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'stale': return 'red';
      default: return 'gray';
    }
  };

  const getHealthIcon = () => {
    switch (pulse.health) {
      case 'healthy': return FiActivity;
      case 'warning': return FiClock;
      case 'stale': return FiAlertCircle;
      default: return FiClock;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const tooltipLabel = pulse.lastVerifiedAt
    ? `Last verified with OpenAI: ${formatTimestamp(pulse.lastVerifiedAt)}\nOpenAI status: ${pulse.openaiStatus || 'unknown'}\nTime since check: ${pulse.secondsSinceVerification}s`
    : 'Waiting for first verification check';

  return (
    <Tooltip label={tooltipLabel} hasArrow>
      <HStack spacing={2} fontSize="xs">
        <Box
          as="span"
          w={2}
          h={2}
          borderRadius="full"
          bg={`${getHealthColor()}.400`}
          animation={pulse.health === 'healthy' ? 'pulse 2s infinite' : undefined}
          sx={{
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
        <Icon 
          as={getHealthIcon()} 
          color={`${getHealthColor()}.500`}
        />
        <Text color={`${getHealthColor()}.600`} fontWeight="medium">
          {pulse.health === 'healthy' && 'Active'}
          {pulse.health === 'warning' && 'Processing'}
          {pulse.health === 'stale' && 'Check pending'}
          {pulse.health === 'unknown' && 'Waiting'}
        </Text>
        {pulse.secondsSinceVerification !== undefined && pulse.health !== 'unknown' && (
          <Badge 
            colorScheme={getHealthColor()} 
            variant="subtle"
            fontSize="2xs"
          >
            {pulse.secondsSinceVerification < 60
              ? `${pulse.secondsSinceVerification}s ago`
              : `${Math.floor(pulse.secondsSinceVerification / 60)}m ago`
            }
          </Badge>
        )}
      </HStack>
    </Tooltip>
  );
}
